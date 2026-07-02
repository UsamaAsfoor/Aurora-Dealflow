ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assigned_to_user_id" text REFERENCES "users"("id");

CREATE TABLE IF NOT EXISTS "lead_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "title" text NOT NULL,
  "description" text,
  "due_date" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lead_tasks_lead_id_idx" ON "lead_tasks" ("lead_id");

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_idx" ON "lead_activities" ("lead_id");
CREATE INDEX IF NOT EXISTS "lead_activities_created_at_idx" ON "lead_activities" ("created_at");

CREATE TABLE IF NOT EXISTS "conversation_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "channel" text NOT NULL,
  "direction" text NOT NULL,
  "body" text NOT NULL,
  "status" text DEFAULT 'sent' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "conversation_messages_lead_id_idx" ON "conversation_messages" ("lead_id");

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "playbook_key" text,
  "filter_snapshot" jsonb,
  "target_stage_ids" jsonb,
  "status" text DEFAULT 'draft' NOT NULL,
  "is_template" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "campaigns_user_id_idx" ON "campaigns" ("user_id");

CREATE TABLE IF NOT EXISTS "campaign_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE cascade,
  "sort_order" integer NOT NULL,
  "channel" text NOT NULL,
  "delay_days" integer DEFAULT 0 NOT NULL,
  "subject" text,
  "template" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "campaign_steps_campaign_id_idx" ON "campaign_steps" ("campaign_id");

CREATE TABLE IF NOT EXISTS "campaign_enrollments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE cascade,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "status" text DEFAULT 'active' NOT NULL,
  "current_step" integer DEFAULT 0 NOT NULL,
  "next_run_at" timestamp with time zone,
  "paused_at" timestamp with time zone,
  "enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "campaign_enrollments_campaign_id_idx" ON "campaign_enrollments" ("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_enrollments_lead_id_idx" ON "campaign_enrollments" ("lead_id");
CREATE INDEX IF NOT EXISTS "campaign_enrollments_next_run_at_idx" ON "campaign_enrollments" ("next_run_at");

CREATE TABLE IF NOT EXISTS "skip_trace_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider" text DEFAULT 'demo' NOT NULL,
  "result" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "skip_trace_requests_lead_id_idx" ON "skip_trace_requests" ("lead_id");

CREATE TABLE IF NOT EXISTS "deal_rooms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL UNIQUE REFERENCES "leads"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" text DEFAULT 'active' NOT NULL,
  "arv" numeric(14, 2),
  "repair_estimate" numeric(14, 2),
  "mao" numeric(14, 2),
  "assignment_fee" numeric(14, 2),
  "checklist" jsonb,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "deal_rooms_user_id_idx" ON "deal_rooms" ("user_id");

CREATE TABLE IF NOT EXISTS "deal_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_room_id" uuid NOT NULL REFERENCES "deal_rooms"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "doc_type" text DEFAULT 'other' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "deal_documents_deal_room_id_idx" ON "deal_documents" ("deal_room_id");

CREATE TABLE IF NOT EXISTS "buyers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "company" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "buyers_user_id_idx" ON "buyers" ("user_id");

CREATE TABLE IF NOT EXISTS "buy_boxes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "buyer_id" uuid NOT NULL UNIQUE REFERENCES "buyers"("id") ON DELETE cascade,
  "areas" jsonb,
  "min_price" numeric(14, 2),
  "max_price" numeric(14, 2),
  "property_types" jsonb,
  "strategies" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "buy_boxes_buyer_id_idx" ON "buy_boxes" ("buyer_id");

CREATE TABLE IF NOT EXISTS "deal_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_room_id" uuid NOT NULL REFERENCES "deal_rooms"("id") ON DELETE cascade,
  "buyer_id" uuid NOT NULL REFERENCES "buyers"("id") ON DELETE cascade,
  "amount" numeric(14, 2) NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "deal_offers_deal_room_id_idx" ON "deal_offers" ("deal_room_id");

CREATE TABLE IF NOT EXISTS "plans" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "price_monthly" integer NOT NULL,
  "limits" jsonb NOT NULL,
  "stripe_price_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE cascade,
  "plan_id" text NOT NULL REFERENCES "plans"("id"),
  "status" text DEFAULT 'active' NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");

CREATE TABLE IF NOT EXISTS "usage_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "metric" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "usage_records_user_metric_idx" ON "usage_records" ("user_id", "metric");
