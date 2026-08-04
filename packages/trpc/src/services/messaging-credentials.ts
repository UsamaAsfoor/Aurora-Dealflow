import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@aurora/db";
import { messagingProviderCredentials } from "@aurora/db";
import type { SmsCredentials } from "@aurora/integrations";
import {
  decryptSecret,
  encryptSecret,
  maskAccountSid,
  maskSecret,
} from "./credentials-crypto.js";

export type MessagingProvider = "twilio";

type TwilioSecrets = {
  authToken: string;
};

async function findCredentialRow(
  db: Db,
  userId: string,
  provider: MessagingProvider,
) {
  const rows = await db
    .select()
    .from(messagingProviderCredentials)
    .where(
      and(
        eq(messagingProviderCredentials.userId, userId),
        eq(messagingProviderCredentials.provider, provider),
      ),
    )
    .orderBy(desc(messagingProviderCredentials.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserSmsCredentials(
  db: Db,
  userId: string,
  provider: MessagingProvider = "twilio",
): Promise<SmsCredentials | null> {
  const row = await findCredentialRow(db, userId, provider);
  if (!row?.isActive || !row.accountSid || !row.fromNumber) return null;

  try {
    const secrets = JSON.parse(
      decryptSecret(row.secretsCiphertext, row.secretsNonce),
    ) as TwilioSecrets;
    if (!secrets.authToken) return null;
    return {
      accountSid: row.accountSid,
      authToken: secrets.authToken,
      fromNumber: row.fromNumber,
    };
  } catch {
    return null;
  }
}

export async function getTwilioSettingsMasked(db: Db, userId: string) {
  const row = await findCredentialRow(db, userId, "twilio");

  if (!row) {
    return {
      configured: false as const,
      provider: "twilio" as const,
      accountSid: null,
      fromNumber: null,
      authTokenMasked: null,
      isActive: false,
      lastVerifiedAt: null,
      lastError: null,
    };
  }

  return {
    configured: true as const,
    provider: "twilio" as const,
    accountSid: row.accountSid ? maskAccountSid(row.accountSid) : null,
    fromNumber: row.fromNumber,
    authTokenMasked: "••••••••",
    isActive: row.isActive,
    lastVerifiedAt: row.lastVerifiedAt,
    lastError: row.lastError,
  };
}

export async function upsertTwilioCredentials(
  db: Db,
  userId: string,
  input: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    label?: string;
  },
) {
  const encrypted = encryptSecret(
    JSON.stringify({ authToken: input.authToken } satisfies TwilioSecrets),
  );

  const existing = await findCredentialRow(db, userId, "twilio");

  if (existing) {
    await db
      .update(messagingProviderCredentials)
      .set({
        accountSid: input.accountSid.trim(),
        fromNumber: input.fromNumber.trim(),
        label: input.label ?? "Twilio",
        secretsCiphertext: encrypted.ciphertext,
        secretsNonce: encrypted.nonce,
        isActive: true,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(messagingProviderCredentials.id, existing.id));
    return existing.id;
  }

  const [inserted] = await db
    .insert(messagingProviderCredentials)
    .values({
      userId,
      provider: "twilio",
      label: input.label ?? "Twilio",
      accountSid: input.accountSid.trim(),
      fromNumber: input.fromNumber.trim(),
      secretsCiphertext: encrypted.ciphertext,
      secretsNonce: encrypted.nonce,
      isActive: true,
    })
    .returning({ id: messagingProviderCredentials.id });

  return inserted!.id;
}

export async function clearTwilioCredentials(db: Db, userId: string) {
  await db
    .delete(messagingProviderCredentials)
    .where(
      and(
        eq(messagingProviderCredentials.userId, userId),
        eq(messagingProviderCredentials.provider, "twilio"),
      ),
    );
}

export async function markTwilioVerified(
  db: Db,
  userId: string,
  ok: boolean,
  error?: string,
) {
  await db
    .update(messagingProviderCredentials)
    .set({
      lastVerifiedAt: ok ? new Date() : undefined,
      lastError: ok ? null : (error ?? "Verification failed"),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messagingProviderCredentials.userId, userId),
        eq(messagingProviderCredentials.provider, "twilio"),
      ),
    );
}

/** Normalize US-ish phone numbers for Twilio. */
export function normalizePhoneNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}

export function extractPhonesFromSkipTrace(result: unknown): string[] {
  if (!result || typeof result !== "object") return [];
  const phones = (result as { phones?: unknown }).phones;
  if (!Array.isArray(phones)) return [];
  return phones
    .map((p) => (typeof p === "string" ? normalizePhoneNumber(p) : null))
    .filter((p): p is string => Boolean(p));
}

export { maskSecret };
