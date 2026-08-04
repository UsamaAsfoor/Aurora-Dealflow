/**
 * Provider-agnostic SMS layer.
 * Twilio is the first implementation; additional providers plug in here.
 */

export type SmsProviderId = "twilio" | "demo";

export interface SmsCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SmsSendInput {
  to: string;
  body: string;
}

export interface SmsSendResult {
  status: "sent" | "failed" | "queued";
  provider: SmsProviderId;
  sid?: string;
  to?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SmsProvider {
  readonly id: SmsProviderId;
  sendSms(input: SmsSendInput): Promise<SmsSendResult>;
}
