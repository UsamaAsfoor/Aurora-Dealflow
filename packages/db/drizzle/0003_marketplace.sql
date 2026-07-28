ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'wholesaler' NOT NULL;

ALTER TABLE "buy_boxes" ADD COLUMN IF NOT EXISTS "deals_per_month" integer;
ALTER TABLE "buy_boxes" ADD COLUMN IF NOT EXISTS "capital_range" text;
ALTER TABLE "buy_boxes" ADD COLUMN IF NOT EXISTS "sms_consent" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "marketplace_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_room_id" uuid NOT NULL REFERENCES "deal_rooms"("id") ON DELETE cascade,
  "publisher_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" text DEFAULT 'published' NOT NULL,
  "city" text NOT NULL,
  "state" text NOT NULL,
  "beds" integer,
  "baths" numeric(4, 1),
  "sqft" integer,
  "photo_url" text,
  "arv" numeric(14, 2),
  "asking_price" numeric(14, 2),
  "strategy" text,
  "teaser_summary" text,
  "full_address" text,
  "line1" text,
  "zip" text,
  "gallery" jsonb,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "marketplace_listings_status_idx" ON "marketplace_listings" ("status");
CREATE INDEX IF NOT EXISTS "marketplace_listings_publisher_idx" ON "marketplace_listings" ("publisher_user_id");

CREATE TABLE IF NOT EXISTS "listing_unlocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "marketplace_listings"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "listing_unlocks_listing_idx" ON "listing_unlocks" ("listing_id");
CREATE INDEX IF NOT EXISTS "listing_unlocks_user_idx" ON "listing_unlocks" ("user_id");

CREATE TABLE IF NOT EXISTS "marketplace_blasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "marketplace_listings"("id") ON DELETE cascade,
  "publisher_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "channel" text NOT NULL,
  "recipient_count" integer DEFAULT 0 NOT NULL,
  "body" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "marketplace_blasts_listing_idx" ON "marketplace_blasts" ("listing_id");

INSERT INTO "plans" ("id", "name", "price_monthly", "limits", "stripe_price_id")
VALUES (
  'scale',
  'Scale',
  39900,
  '{"searches":5000,"leads":2000,"ai_analyses":500,"sms":2000,"emails":2000,"blasts":200,"skip_traces":500}'::jsonb,
  null
)
ON CONFLICT ("id") DO NOTHING;
