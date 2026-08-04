import { createSmsProvider } from "../sms/create-sms-provider.js";
import type { SmsCredentials } from "../sms/types.js";
import { DemoCommsService, type CommsService } from "./demo.js";

export type CreateCommsOptions = {
  /** Per-user BYO Twilio (or future SMS provider) credentials */
  sms?: SmsCredentials | null;
  email?: { apiKey: string; from: string } | null;
};

/**
 * Prefer BYO / platform Twilio + Resend when credentials are present;
 * otherwise demo (logged) sends. SMS is provider-agnostic under createSmsProvider.
 */
export function createCommsService(options: CreateCommsOptions = {}): CommsService {
  const smsProvider = createSmsProvider(options.sms ?? null);

  const resendKey =
    options.email?.apiKey ?? process.env.RESEND_API_KEY;
  const emailFrom =
    options.email?.from ??
    process.env.RESEND_FROM_EMAIL ??
    "Aurora <noreply@aurora.dealflow>";
  const hasResend = Boolean(resendKey);

  return {
    async sendSms(input) {
      const result = await smsProvider.sendSms(input);
      return {
        status: result.status,
        metadata: {
          provider: result.provider,
          sid: result.sid,
          to: result.to ?? input.to,
          error: result.error,
          ...result.metadata,
        },
      };
    },

    async sendEmail(input) {
      if (!hasResend) {
        return {
          status: "sent",
          metadata: {
            provider: "demo",
            to: input.to,
            subject: input.subject,
            reason: "resend_not_configured",
          },
        };
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [input.to],
          subject: input.subject,
          text: input.body,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          status: "failed",
          metadata: { provider: "resend", error: errText.slice(0, 500) },
        };
      }

      const data = (await res.json()) as { id?: string };
      return {
        status: "sent",
        metadata: { provider: "resend", id: data.id, to: input.to },
      };
    },

    async generateCallScript(input) {
      return new DemoCommsService().generateCallScript(input);
    },
  };
}
