import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversationMessages } from "@aurora/db";
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
  DemoCommsService,
  type CommsService,
} from "@aurora/integrations";

const comms = new DemoCommsService() as CommsService;

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

  sendSms: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);
      await checkUsageLimit(ctx.db, ctx.userId, "sms");

      const result = await comms.sendSms({ to: "demo", body: input.body });

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
      });

      await incrementUsage(ctx.db, ctx.userId, "sms");
      return { success: true, ...result };
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

      const result = await comms.sendEmail({
        to: "demo@example.com",
        subject: input.subject,
        body: input.body,
      });

      await ctx.db.insert(conversationMessages).values({
        leadId: input.leadId,
        userId: ctx.userId,
        channel: "email",
        direction: "outbound",
        body: input.body,
        status: result.status,
        metadata: { subject: input.subject, ...result.metadata },
      });

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "email",
        title: `Email sent: ${input.subject}`,
        body: input.body,
      });

      await incrementUsage(ctx.db, ctx.userId, "emails");
      return { success: true, ...result };
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
      return comms.generateCallScript({
        ownerName: "Property Owner",
        strategy: "wholesale",
      });
    }),
});
