import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  orgId: text("org_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  color: text("color").default("#64748b"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attomId: text("attom_id").notNull().unique(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    county: text("county"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    location: text("location"),
    propertyType: text("property_type").notNull(),
    beds: integer("beds"),
    baths: numeric("baths", { precision: 4, scale: 1 }),
    sqft: integer("sqft"),
    lotSqft: integer("lot_sqft"),
    yearBuilt: integer("year_built"),
    isVacant: boolean("is_vacant").default(false).notNull(),
    isPreForeclosure: boolean("is_pre_foreclosure").default(false).notNull(),
    ownershipYears: integer("ownership_years"),
    rawData: jsonb("raw_data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("properties_attom_id_idx").on(table.attomId),
    index("properties_location_idx").on(table.city, table.state, table.zip),
  ],
);

export const propertyOwners = pgTable("property_owners", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mailingLine1: text("mailing_line1").notNull(),
  mailingLine2: text("mailing_line2"),
  mailingCity: text("mailing_city").notNull(),
  mailingState: text("mailing_state").notNull(),
  mailingZip: text("mailing_zip").notNull(),
  isAbsentee: boolean("is_absentee").default(false).notNull(),
});

export const propertyValuations = pgTable("property_valuations", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  avm: numeric("avm", { precision: 14, scale: 2 }),
  assessedValue: numeric("assessed_value", { precision: 14, scale: 2 }),
  estimatedMortgageBalance: numeric("estimated_mortgage_balance", {
    precision: 14,
    scale: 2,
  }),
  estimatedEquity: numeric("estimated_equity", { precision: 14, scale: 2 }),
  equityPercent: numeric("equity_percent", { precision: 6, scale: 2 }),
});

export const propertyMortgages = pgTable("property_mortgages", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  lender: text("lender"),
  balanceEstimate: numeric("balance_estimate", { precision: 14, scale: 2 }),
  interestRate: numeric("interest_rate", { precision: 6, scale: 3 }),
  loanType: text("loan_type"),
});

export const propertyTaxes = pgTable("property_taxes", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  annualAmount: numeric("annual_amount", { precision: 14, scale: 2 }),
  isDelinquent: boolean("is_delinquent").default(false).notNull(),
  delinquentAmount: numeric("delinquent_amount", { precision: 14, scale: 2 }),
});

export const propertySales = pgTable("property_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  saleDate: timestamp("sale_date", { withTimezone: true }),
  salePrice: numeric("sale_price", { precision: 14, scale: 2 }),
  saleType: text("sale_type"),
});

export const propertyComps = pgTable("property_comps", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  compAttomId: text("comp_attom_id").notNull(),
  line1: text("line1").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  saleDate: timestamp("sale_date", { withTimezone: true }),
  salePrice: numeric("sale_price", { precision: 14, scale: 2 }),
  distanceMiles: numeric("distance_miles", { precision: 8, scale: 2 }),
  beds: integer("beds"),
  baths: numeric("baths", { precision: 4, scale: 1 }),
  sqft: integer("sqft"),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    pipelineStageId: uuid("pipeline_stage_id")
      .notNull()
      .references(() => pipelineStages.id),
    source: text("source").default("search").notNull(),
    notes: text("notes"),
    assignedToUserId: text("assigned_to_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("leads_user_id_idx").on(table.userId),
    index("leads_property_id_idx").on(table.propertyId),
  ],
);

export const attomCache = pgTable(
  "attom_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cacheKey: text("cache_key").notNull().unique(),
    response: jsonb("response").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("attom_cache_expires_at_idx").on(table.expiresAt)],
);

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    attomId: text("attom_id"),
    score: integer("score").notNull(),
    signals: jsonb("signals").notNull(),
    summary: text("summary").notNull(),
    strategy: text("strategy").notNull(),
    reasoning: text("reasoning").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("ai_analyses_property_id_idx").on(table.propertyId),
    index("ai_analyses_attom_id_idx").on(table.attomId),
  ],
);

export const pipelineStagesRelations = relations(pipelineStages, ({ many }) => ({
  leads: many(leads),
}));

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  pipelineStages: many(pipelineStages),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(propertyOwners),
  valuation: one(propertyValuations),
  mortgage: one(propertyMortgages),
  tax: one(propertyTaxes),
  sales: many(propertySales),
  comps: many(propertyComps),
  leads: many(leads),
  aiAnalysis: one(aiAnalyses),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  user: one(users, { fields: [leads.userId], references: [users.id] }),
  assignedTo: one(users, {
    fields: [leads.assignedToUserId],
    references: [users.id],
    relationName: "assignedLeads",
  }),
  property: one(properties, {
    fields: [leads.propertyId],
    references: [properties.id],
  }),
  pipelineStage: one(pipelineStages, {
    fields: [leads.pipelineStageId],
    references: [pipelineStages.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;

export * from "./extensions.js";

export const postgisSetupSql = sql`CREATE EXTENSION IF NOT EXISTS postgis`;
