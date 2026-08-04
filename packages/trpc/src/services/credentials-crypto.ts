import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw =
    process.env.CREDENTIALS_ENCRYPTION_KEY ??
    process.env.JWT_SECRET ??
    "aurora-dev-credentials-key-change-me";
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): {
  ciphertext: string;
  nonce: string;
} {
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    nonce: nonce.toString("base64"),
  };
}

export function decryptSecret(ciphertext: string, nonce: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = createDecipheriv(
    ALGO,
    getKey(),
    Buffer.from(nonce, "base64"),
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function maskSecret(value: string, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "••••";
  return `${"•".repeat(Math.min(12, value.length - visible))}${value.slice(-visible)}`;
}

export function maskAccountSid(sid: string): string {
  if (!sid) return "";
  if (sid.length <= 8) return maskSecret(sid, 2);
  return `${sid.slice(0, 4)}…${sid.slice(-4)}`;
}
