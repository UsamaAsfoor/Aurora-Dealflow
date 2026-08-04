import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { buyers, conversationMessages, skipTraceRequests } from "@aurora/db";
import { createCommsService } from "@aurora/integrations";
import { protectedProcedure, router } from "../trpc.js";
import {
  assertLeadOwnership,
  logActivity,
} from "../services/activity-service.js";
import {
  checkUsageLimit,
  incrementUsage,
} from "../services/usage-service.js";
import { pauseEnrollmentsOnReply } from "../services/campaign-processor.js";
import {
  extractPhonesFromSkipTrace,
  getUserSmsCredentials,
  normalizePhoneNumber,
} from "../services/messaging-credentials.js";

async function resolveLeadPhone(
  db: Parameters<typeof assertLeadOwnership>[0],
  leadId: string,
  userId: string,
  explicitPhone?: string,
): Promise<string> {
  if (explicitPhone) {
    const normalized = normalizePhoneNumber(explicitPhone);
    if (!normalized) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid phone number",
      });
    }
    return normalized;
  }

  const latest = await db
    .select()
    .from(skipTraceRequests)
    .where(
      and(
        eq(skipTraceRequests.leadId, leadId),
        eq(skipTraceRequests.userId, userId),
      ),
    )
    .orderBy(desc(skipTraceRequests.createdAt))
    .limit(1);

  const phones = extractPhonesFromSkipTrace(latest[0]?.result);
  if (phones[0]) return phones[0];

  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "No phone number on this lead. Run skip trace or enter a phone number.",
  });
}

async function getUserComms(db: Parameters<typeof assertLeadOwnership>[0], userId: string) {
  const sms = await getUserSmsCredentials(db, userId, "twilio");
  return createCommsService({ sms });
}

const FOLLOW_UP_TEMPLATES = {
  intro:
    "Hi — this is regarding your property. Do you have a few minutes to discuss an offer?",
  follow_up:
    "Just following up on my earlier message about your property. Still open to a cash offer?",
  appointment:
    "Would you be available for a quick call tomorrow to discuss next steps on your property?",
  property_share:
    "I have a property that may fit your buy box. Reply YES if you'd like the details.",
} as const;

export const commsRouter = router({
  listMessages: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      return ctx.db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.leadId, input.leadId))
        .orderBy(desc(conversationMessages.createdAt));
    }),

  smsStatus: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getUserSmsCredentials(ctx.db, ctx.userId, "twilio");
    return {
      ready: Boolean(creds),
      provider: creds ? ("twilio" as const) : ("demo" as const),
      fromNumber: creds?.fromNumber ?? null,
      mode: creds ? ("byo_twilio" as const) : ("demo_or_platform" as const),
    };
  }),

  sendSms: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        body: z.string().min(1).max(1600),
        to: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      await checkUsageLimit(ctx.db, ctx.userId, "sms");

      const to = await resolveLeadPhone(
        ctx.db,
        input.leadId,
        ctx.userId,
        input.to,
      );
      const comms = await getUserComms(ctx.db, ctx.userId);
      const result = await comms.sendSms({ to, body: input.body });

      await ctx.db.insert(conversationMessages).values({
        leadId: input.leadId,
        userId: ctx.userId,
        channel: "sms",
        direction: "outbound",
        body: input.body,
        status: result.status,
        metadata: result.metadata,
      });

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "sms",
        title: "SMS sent",
        body: input.body,
        metadata: { to, ...result.metadata },
      });

      await incrementUsage(ctx.db, ctx.userId, "sms");
      return { success: true, to, ...result };
    }),

  /** One-click / templated follow-up SMS to a lead. */
  sendFollowUp: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        template: z
          .enum(["intro", "follow_up", "appointment", "property_share"])
          .default("follow_up"),
        customBody: z.string().max(1600).optional(),
        to: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      await checkUsageLimit(ctx.db, ctx.userId, "sms");

      const body =
        input.customBody?.trim() || FOLLOW_UP_TEMPLATES[input.template];
      const to = await resolveLeadPhone(
        ctx.db,
        input.leadId,
        ctx.userId,
        input.to,
      );
      const comms = await getUserComms(ctx.db, ctx.userId);
      const result = await comms.sendSms({ to, body });

      await ctx.db.insert(conversationMessages).values({
        leadId: input.leadId,
        userId: ctx.userId,
        channel: "sms",
        direction: "outbound",
        body,
        status: result.status,
        metadata: { template: input.template, ...result.metadata },
      });

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "sms",
        title: `Follow-up SMS (${input.template.replace(/_/g, " ")})`,
        body,
        metadata: { to, template: input.template, ...result.metadata },
      });

      await incrementUsage(ctx.db, ctx.userId, "sms");
      return { success: true, to, body, ...result };
    }),

  /** Send a property pitch SMS to selected CRM buyers (consent-aware). */
  sendPropertyToBuyers: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid().optional(),
        buyerIds: z.array(z.string().uuid()).min(1).max(50),
        body: z.string().min(1).max(1600),
        propertySummary: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.leadId) {
        await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      }
      await checkUsageLimit(ctx.db, ctx.userId, "sms");

      const ownedBuyers = await ctx.db.query.buyers.findMany({
        where: eq(buyers.userId, ctx.userId),
        with: { buyBox: true },
      });

      const selected = ownedBuyers.filter((b) =>
        input.buyerIds.includes(b.id),
      );
      if (selected.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No matching buyers found",
        });
      }

      const message = input.propertySummary
        ? `${input.body}\n\n${input.propertySummary}`
        : input.body;

      const comms = await getUserComms(ctx.db, ctx.userId);
      const results: Array<{
        buyerId: string;
        name: string;
        ok: boolean;
        to?: string;
        error?: string;
      }> = [];

      for (const buyer of selected) {
        if (!buyer.phone) {
          results.push({
            buyerId: buyer.id,
            name: buyer.name,
            ok: false,
            error: "No phone",
          });
          continue;
        }
        if (buyer.buyBox && buyer.buyBox.smsConsent === false) {
          results.push({
            buyerId: buyer.id,
            name: buyer.name,
            ok: false,
            error: "No SMS consent",
          });
          continue;
        }

        const to = normalizePhoneNumber(buyer.phone);
        if (!to) {
          results.push({
            buyerId: buyer.id,
            name: buyer.name,
            ok: false,
            error: "Invalid phone",
          });
          continue;
        }

        const result = await comms.sendSms({ to, body: message });
        const ok = result.status === "sent" || result.status === "queued";
        results.push({
          buyerId: buyer.id,
          name: buyer.name,
          ok,
          to,
          error: ok ? undefined : String(result.metadata?.error ?? "failed"),
        });

        if (ok) {
          await incrementUsage(ctx.db, ctx.userId, "sms");
          if (input.leadId) {
            await ctx.db.insert(conversationMessages).values({
              leadId: input.leadId,
              userId: ctx.userId,
              channel: "sms",
              direction: "outbound",
              body: message,
              status: result.status,
              metadata: {
                kind: "property_to_buyer",
                buyerId: buyer.id,
                ...result.metadata,
              },
            });
          }
        }
      }

      if (input.leadId) {
        await logActivity(ctx.db, {
          leadId: input.leadId,
          userId: ctx.userId,
          type: "sms",
          title: "Property sent to buyers",
          body: `Sent to ${results.filter((r) => r.ok).length}/${results.length} buyers`,
          metadata: { results },
        });
      }

      return {
        success: true,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      };
    }),

  sendEmail: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        subject: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      await checkUsageLimit(ctx.db, ctx.userId, "emails");

      const latest = await ctx.db
        .select()
        .from(skipTraceRequests)
        .where(
          and(
            eq(skipTraceRequests.leadId, input.leadId),
            eq(skipTraceRequests.userId, ctx.userId),
          ),
        )
        .orderBy(desc(skipTraceRequests.createdAt))
        .limit(1);
      const skipResult = latest[0]?.result;
      const emails =
        skipResult &&
        typeof skipResult === "object" &&
        Array.isArray((skipResult as { emails?: unknown }).emails)
          ? (skipResult as { emails: string[] }).emails
          : [];
      const to = emails[0] ?? "demo@example.com";

      const comms = await getUserComms(ctx.db, ctx.userId);
      const emailResult = await comms.sendEmail({
        to,
        subject: input.subject,
        body: input.body,
      });

      await ctx.db.insert(conversationMessages).values({
        leadId: input.leadId,
        userId: ctx.userId,
        channel: "email",
        direction: "outbound",
        body: input.body,
        status: emailResult.status,
        metadata: { subject: input.subject, to, ...emailResult.metadata },
      });

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "email",
        title: `Email sent: ${input.subject}`,
        body: input.body,
      });

      await incrementUsage(ctx.db, ctx.userId, "emails");
      return { success: true, to, ...emailResult };
    }),

  logCall: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        durationSeconds: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "call",
        title: "Call logged",
        body: input.notes,
        metadata: { durationSeconds: input.durationSeconds },
      });

      return { success: true };
    }),

  simulateInboundReply: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        body: z.string().min(1),
        channel: z.enum(["sms", "email"]).default("sms"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      await ctx.db.insert(conversationMessages).values({
        leadId: input.leadId,
        userId: ctx.userId,
        channel: input.channel,
        direction: "inbound",
        body: input.body,
        status: "received",
      });

      await pauseEnrollmentsOnReply(ctx.db, input.leadId);

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: input.channel,
        title: "Owner replied",
        body: input.body,
      });

      return { success: true };
    }),

  generateScript: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      const comms = await getUserComms(ctx.db, ctx.userId);
      return comms.generateCallScript({
        ownerName: "Property Owner",
        strategy: "wholesale",
      });
    }),
});
