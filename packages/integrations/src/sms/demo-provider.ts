import type { SmsProvider, SmsSendInput, SmsSendResult } from "./types.js";

export class DemoSmsProvider implements SmsProvider {
  readonly id = "demo" as const;

  async sendSms(input: SmsSendInput): Promise<SmsSendResult> {
    return {
      status: "sent",
      provider: "demo",
      to: input.to,
      metadata: { demo: true },
    };
  }
}
