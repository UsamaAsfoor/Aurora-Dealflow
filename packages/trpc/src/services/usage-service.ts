import { and, eq, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Db } from "@aurora/db";
import { plans, subscriptions, usageRecords } from "@aurora/db";

const DEFAULT_LIMITS = {
  searches: 100,
  leads: 25,
  ai_analyses: 10,
  sms: 50,
  emails: 50,
};

function periodBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export async function getUserPlan(db: Db, userId: string) {
  const subRows = await db
    .select({ plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (subRows[0]?.plan) {
    return subRows[0].plan;
  }

  const freePlan = await db.query.plans.findFirst({
    where: eq(plans.id, "free"),
  });

  return (
    freePlan ?? {
      id: "free",
      name: "Free",
      priceMonthly: 0,
      limits: DEFAULT_LIMITS,
      stripePriceId: null,
      createdAt: new Date(),
    }
  );
}

export async function getUsageCount(
  db: Db,
  userId: string,
  metric: string,
) {
  const { start, end } = periodBounds();
  const row = await db
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        eq(usageRecords.metric, metric),
        gte(usageRecords.periodStart, start),
        lte(usageRecords.periodEnd, end),
      ),
    )
    .limit(1);

  return row[0]?.count ?? 0;
}

export async function incrementUsage(
  db: Db,
  userId: string,
  metric: string,
  amount = 1,
) {
  const { start, end } = periodBounds();
  const existing = await db
    .select()
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        eq(usageRecords.metric, metric),
        gte(usageRecords.periodStart, start),
        lte(usageRecords.periodEnd, end),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(usageRecords)
      .set({
        count: existing[0].count + amount,
        updatedAt: new Date(),
      })
      .where(eq(usageRecords.id, existing[0].id));
    return existing[0].count + amount;
  }

  await db.insert(usageRecords).values({
    userId,
    metric,
    count: amount,
    periodStart: start,
    periodEnd: end,
  });

  return amount;
}

export async function checkUsageLimit(
  db: Db,
  userId: string,
  metric: keyof typeof DEFAULT_LIMITS,
) {
  const plan = await getUserPlan(db, userId);
  const limits = (plan.limits ?? DEFAULT_LIMITS) as Record<string, number>;
  const limit = limits[metric] ?? DEFAULT_LIMITS[metric];
  const used = await getUsageCount(db, userId, metric);

  if (used >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Monthly ${metric} limit reached (${limit}). Upgrade your plan to continue.`,
    });
  }
}

export async function getUsageSummary(db: Db, userId: string) {
  const plan = await getUserPlan(db, userId);
  const limits = (plan.limits ?? DEFAULT_LIMITS) as Record<string, number>;
  const metrics = Object.keys(DEFAULT_LIMITS) as (keyof typeof DEFAULT_LIMITS)[];

  const usage = await Promise.all(
    metrics.map(async (metric) => ({
      metric,
      used: await getUsageCount(db, userId, metric),
      limit: limits[metric] ?? DEFAULT_LIMITS[metric],
    })),
  );

  return { plan, usage };
}
