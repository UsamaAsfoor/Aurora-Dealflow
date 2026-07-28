import { DemoCommsService, type CommsService } from "./demo.js";

/**
 * Prefer Twilio + Resend when credentials are present; otherwise demo (logged) sends.
 */
export function createCommsService(): CommsService {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.RESEND_FROM_EMAIL ?? "Aurora <noreply@aurora.dealflow>";

  const hasTwilio = Boolean(twilioSid && twilioToken && twilioFrom);
  const hasResend = Boolean(resendKey);

  if (!hasTwilio && !hasResend) {
    return new DemoCommsService();
  }

  return {
    async sendSms(input) {
      if (!hasTwilio) {
        return {
          status: "sent",
          metadata: { provider: "demo", to: input.to, reason: "twilio_not_configured" },
        };
      }

      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const body = new URLSearchParams({
        To: input.to,
        From: twilioFrom!,
        Body: input.body,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return {
          status: "failed",
          metadata: { provider: "twilio", error: errText.slice(0, 500) },
        };
      }

      const data = (await res.json()) as { sid?: string };
      return {
        status: "sent",
        metadata: { provider: "twilio", sid: data.sid, to: input.to },
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
