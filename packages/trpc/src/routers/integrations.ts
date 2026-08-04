import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createCommsService } from "@aurora/integrations";
import { protectedProcedure, router } from "../trpc.js";
import {
  clearTwilioCredentials,
  getTwilioSettingsMasked,
  getUserSmsCredentials,
  markTwilioVerified,
  normalizePhoneNumber,
  upsertTwilioCredentials,
} from "../services/messaging-credentials.js";

const twilioInput = z.object({
  accountSid: z
    .string()
    .min(10)
    .regex(/^AC/i, "Account SID should start with AC"),
  authToken: z.string().min(16),
  fromNumber: z.string().min(8),
  label: z.string().optional(),
});

export const integrationsRouter = router({
  getTwilio: protectedProcedure.query(async ({ ctx }) => {
    return getTwilioSettingsMasked(ctx.db, ctx.userId);
  }),

  saveTwilio: protectedProcedure
    .input(twilioInput)
    .mutation(async ({ ctx, input }) => {
      const from = normalizePhoneNumber(input.fromNumber);
      if (!from) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid phone number (E.164 or US 10-digit)",
        });
      }

      await upsertTwilioCredentials(ctx.db, ctx.userId, {
        accountSid: input.accountSid.trim(),
        authToken: input.authToken.trim(),
        fromNumber: from,
        label: input.label,
      });

      return getTwilioSettingsMasked(ctx.db, ctx.userId);
    }),

  clearTwilio: protectedProcedure.mutation(async ({ ctx }) => {
    await clearTwilioCredentials(ctx.db, ctx.userId);
    return { success: true };
  }),

  /** Sends a short test SMS using the user's BYO Twilio credentials. */
  testTwilio: protectedProcedure
    .input(
      z.object({
        to: z.string().min(8),
        body: z
          .string()
          .min(1)
          .max(320)
          .default("Aurora DealFlow test SMS — your Twilio connection works."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const creds = await getUserSmsCredentials(ctx.db, ctx.userId, "twilio");
      if (!creds) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Save your Twilio Account SID, Auth Token, and From number first.",
        });
      }

      const to = normalizePhoneNumber(input.to);
      if (!to) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter a valid destination phone number",
        });
      }

      const comms = createCommsService({ sms: creds });
      const result = await comms.sendSms({ to, body: input.body });
      const ok = result.status === "sent" || result.status === "queued";

      await markTwilioVerified(
        ctx.db,
        ctx.userId,
        ok,
        ok ? undefined : String(result.metadata?.error ?? "Send failed"),
      );

      if (!ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: String(
            result.metadata?.error ?? "Twilio rejected the test SMS",
          ),
        });
      }

      return {
        success: true,
        provider: result.metadata?.provider,
        sid: result.metadata?.sid,
      };
    }),
});
