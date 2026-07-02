import { relations } from "drizzle-orm";
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
import { leads, properties, users } from "./index.js";

export const leadTasks = pgTable(
  "lead_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("lead_tasks_lead_id_idx").on(table.leadId)],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("lead_activities_lead_id_idx").on(table.leadId),
    index("lead_activities_created_at_idx").on(table.createdAt),
  ],
);

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    direction: text("direction").notNull(),
    body: text("body").notNull(),
    status: text("status").default("sent").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("conversation_messages_lead_id_idx").on(table.leadId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    playbookKey: text("playbook_key"),
    filterSnapshot: jsonb("filter_snapshot"),
    targetStageIds: jsonb("target_stage_ids"),
    status: text("status").default("draft").notNull(),
    isTemplate: boolean("is_template").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("campaigns_user_id_idx").on(table.userId)],
);

export const campaignSteps = pgTable(
  "campaign_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    channel: text("channel").notNull(),
    delayDays: integer("delay_days").default(0).notNull(),
    subject: text("subject"),
    template: text("template").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("campaign_steps_campaign_id_idx").on(table.campaignId)],
);

export const campaignEnrollments = pgTable(
  "campaign_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    currentStep: integer("current_step").default(0).notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("campaign_enrollments_campaign_id_idx").on(table.campaignId),
    index("campaign_enrollments_lead_id_idx").on(table.leadId),
    index("campaign_enrollments_next_run_at_idx").on(table.nextRunAt),
  ],
);

export const skipTraceRequests = pgTable(
  "skip_trace_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    provider: text("provider").default("demo").notNull(),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("skip_trace_requests_lead_id_idx").on(table.leadId)],
);

export const dealRooms = pgTable(
  "deal_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .unique()
      .references(() => leads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("active").notNull(),
    arv: numeric("arv", { precision: 14, scale: 2 }),
    repairEstimate: numeric("repair_estimate", { precision: 14, scale: 2 }),
    mao: numeric("mao", { precision: 14, scale: 2 }),
    assignmentFee: numeric("assignment_fee", { precision: 14, scale: 2 }),
    checklist: jsonb("checklist"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("deal_rooms_user_id_idx").on(table.userId)],
);

export const dealDocuments = pgTable(
  "deal_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealRoomId: uuid("deal_room_id")
      .notNull()
      .references(() => dealRooms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    docType: text("doc_type").default("other").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("deal_documents_deal_room_id_idx").on(table.dealRoomId)],
);

export const buyers = pgTable(
  "buyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("buyers_user_id_idx").on(table.userId)],
);

export const buyBoxes = pgTable(
  "buy_boxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id")
      .notNull()
      .unique()
      .references(() => buyers.id, { onDelete: "cascade" }),
    areas: jsonb("areas"),
    minPrice: numeric("min_price", { precision: 14, scale: 2 }),
    maxPrice: numeric("max_price", { precision: 14, scale: 2 }),
    propertyTypes: jsonb("property_types"),
    strategies: jsonb("strategies"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("buy_boxes_buyer_id_idx").on(table.buyerId)],
);

export const dealOffers = pgTable(
  "deal_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealRoomId: uuid("deal_room_id")
      .notNull()
      .references(() => dealRooms.id, { onDelete: "cascade" }),
    buyerId: uuid("buyer_id")
      .notNull()
      .references(() => buyers.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    status: text("status").default("pending").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("deal_offers_deal_room_id_idx").on(table.dealRoomId)],
);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceMonthly: integer("price_monthly").notNull(),
  limits: jsonb("limits").notNull(),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    status: text("status").default("active").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("subscriptions_user_id_idx").on(table.userId)],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metric: text("metric").notNull(),
    count: integer("count").default(0).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("usage_records_user_metric_idx").on(table.userId, table.metric),
  ],
);

export const leadTasksRelations = relations(leadTasks, ({ one }) => ({
  lead: one(leads, { fields: [leadTasks.leadId], references: [leads.id] }),
  user: one(users, { fields: [leadTasks.userId], references: [users.id] }),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
  user: one(users, { fields: [leadActivities.userId], references: [users.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  steps: many(campaignSteps),
  enrollments: many(campaignEnrollments),
}));

export const campaignStepsRelations = relations(campaignSteps, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSteps.campaignId],
    references: [campaigns.id],
  }),
}));

export const campaignEnrollmentsRelations = relations(
  campaignEnrollments,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignEnrollments.campaignId],
      references: [campaigns.id],
    }),
    lead: one(leads, {
      fields: [campaignEnrollments.leadId],
      references: [leads.id],
    }),
  }),
);

export const dealRoomsRelations = relations(dealRooms, ({ one, many }) => ({
  lead: one(leads, { fields: [dealRooms.leadId], references: [leads.id] }),
  documents: many(dealDocuments),
  offers: many(dealOffers),
}));

export const buyersRelations = relations(buyers, ({ one }) => ({
  buyBox: one(buyBoxes, {
    fields: [buyers.id],
    references: [buyBoxes.buyerId],
  }),
}));
