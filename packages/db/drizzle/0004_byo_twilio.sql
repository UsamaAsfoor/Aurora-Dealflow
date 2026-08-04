CREATE TABLE IF NOT EXISTS "messaging_provider_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "label" text,
  "account_sid" text,
  "from_number" text,
  "secrets_ciphertext" text NOT NULL,
  "secrets_nonce" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_verified_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "messaging_provider_credentials_user_id_idx"
  ON "messaging_provider_credentials" ("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "messaging_provider_credentials_user_provider_uidx"
  ON "messaging_provider_credentials" ("user_id", "provider");
