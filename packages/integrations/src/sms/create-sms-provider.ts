import { DemoSmsProvider } from "./demo-provider.js";
import { TwilioSmsProvider } from "./twilio-provider.js";
import type { SmsCredentials, SmsProvider } from "./types.js";

/**
 * Build an SMS provider. Prefers explicit BYO credentials, then platform env,
 * then demo. Architecture is open for more providers later.
 */
export function createSmsProvider(
  credentials?: SmsCredentials | null,
): SmsProvider {
  if (
    credentials?.accountSid &&
    credentials.authToken &&
    credentials.fromNumber
  ) {
    return new TwilioSmsProvider(credentials);
  }

  const envSid = process.env.TWILIO_ACCOUNT_SID;
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  const envFrom = process.env.TWILIO_FROM_NUMBER;
  if (envSid && envToken && envFrom) {
    return new TwilioSmsProvider({
      accountSid: envSid,
      authToken: envToken,
      fromNumber: envFrom,
    });
  }

  return new DemoSmsProvider();
}
