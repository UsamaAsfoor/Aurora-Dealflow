CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"org_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"color" text DEFAULT '#64748b',
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attom_id" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"county" text,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"location" text,
	"property_type" text NOT NULL,
	"beds" integer,
	"baths" numeric(4, 1),
	"sqft" integer,
	"lot_sqft" integer,
	"year_built" integer,
	"is_vacant" boolean DEFAULT false NOT NULL,
	"is_pre_foreclosure" boolean DEFAULT false NOT NULL,
	"ownership_years" integer,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_attom_id_unique" UNIQUE("attom_id")
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mailing_line1" text NOT NULL,
	"mailing_line2" text,
	"mailing_city" text NOT NULL,
	"mailing_state" text NOT NULL,
	"mailing_zip" text NOT NULL,
	"is_absentee" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"avm" numeric(14, 2),
	"assessed_value" numeric(14, 2),
	"estimated_mortgage_balance" numeric(14, 2),
	"estimated_equity" numeric(14, 2),
	"equity_percent" numeric(6, 2)
);
--> statement-breakpoint
CREATE TABLE "property_mortgages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"lender" text,
	"balance_estimate" numeric(14, 2),
	"interest_rate" numeric(6, 3),
	"loan_type" text
);
--> statement-breakpoint
CREATE TABLE "property_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"annual_amount" numeric(14, 2),
	"is_delinquent" boolean DEFAULT false NOT NULL,
	"delinquent_amount" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "property_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"sale_date" timestamp with time zone,
	"sale_price" numeric(14, 2),
	"sale_type" text
);
--> statement-breakpoint
CREATE TABLE "property_comps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"comp_attom_id" text NOT NULL,
	"line1" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip" text NOT NULL,
	"sale_date" timestamp with time zone,
	"sale_price" numeric(14, 2),
	"distance_miles" numeric(8, 2),
	"beds" integer,
	"baths" numeric(4, 1),
	"sqft" integer
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"pipeline_stage_id" uuid NOT NULL,
	"source" text DEFAULT 'search' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attom_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"response" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attom_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"attom_id" text,
	"score" integer NOT NULL,
	"signals" jsonb NOT NULL,
	"summary" text NOT NULL,
	"strategy" text NOT NULL,
	"reasoning" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_mortgages" ADD CONSTRAINT "property_mortgages_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_taxes" ADD CONSTRAINT "property_taxes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_sales" ADD CONSTRAINT "property_sales_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "property_comps" ADD CONSTRAINT "property_comps_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "properties_attom_id_idx" ON "properties" USING btree ("attom_id");
--> statement-breakpoint
CREATE INDEX "properties_location_idx" ON "properties" USING btree ("city","state","zip");
--> statement-breakpoint
CREATE INDEX "leads_user_id_idx" ON "leads" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "leads_property_id_idx" ON "leads" USING btree ("property_id");
--> statement-breakpoint
CREATE INDEX "attom_cache_expires_at_idx" ON "attom_cache" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "ai_analyses_property_id_idx" ON "ai_analyses" USING btree ("property_id");
--> statement-breakpoint
CREATE INDEX "ai_analyses_attom_id_idx" ON "ai_analyses" USING btree ("attom_id");
