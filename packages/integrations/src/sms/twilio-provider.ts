import type {
  SmsCredentials,
  SmsProvider,
  SmsSendInput,
  SmsSendResult,
} from "./types.js";

export class TwilioSmsProvider implements SmsProvider {
  readonly id = "twilio" as const;

  constructor(private readonly credentials: SmsCredentials) {}

  async sendSms(input: SmsSendInput): Promise<SmsSendResult> {
    const { accountSid, authToken, fromNumber } = this.credentials;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: input.to,
      From: fromNumber,
      Body: input.body,
    });

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
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
          provider: "twilio",
          to: input.to,
          error: errText.slice(0, 500),
        };
      }

      const data = (await res.json()) as { sid?: string; status?: string };
      return {
        status: data.status === "queued" ? "queued" : "sent",
        provider: "twilio",
        sid: data.sid,
        to: input.to,
      };
    } catch (err) {
      return {
        status: "failed",
        provider: "twilio",
        to: input.to,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
