import { eq } from "drizzle-orm";
import { z } from "zod";
import { plans, subscriptions } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import {
  getUsageSummary,
  getUserPlan,
} from "../services/usage-service.js";
import { DemoStripeService } from "@aurora/integrations";

const stripe = new DemoStripeService();

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const plan = await getUserPlan(ctx.db, ctx.userId);
    const sub = await ctx.db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.userId),
    });

    return { plan, subscription: sub };
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    return getUsageSummary(ctx.db, ctx.userId);
  }),

  listPlans: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(plans);
  }),

  createCheckout: protectedProcedure
    .input(z.object({ planId: z.enum(["pro", "team"]) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });

      if (!plan) throw new Error("Plan not found");

      const checkout = await stripe.createCheckoutSession({
        userId: ctx.userId,
        planId: input.planId,
      });

      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const existing = await ctx.db.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, ctx.userId),
      });

      if (existing) {
        await ctx.db
          .update(subscriptions)
          .set({
            planId: input.planId,
            status: "active",
            stripeCustomerId: checkout.customerId,
            stripeSubscriptionId: checkout.subscriptionId,
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, ctx.userId));
      } else {
        await ctx.db.insert(subscriptions).values({
          userId: ctx.userId,
          planId: input.planId,
          status: "active",
          stripeCustomerId: checkout.customerId,
          stripeSubscriptionId: checkout.subscriptionId,
          currentPeriodEnd: periodEnd,
        });
      }

      return checkout;
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(subscriptions)
      .set({ status: "canceled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, ctx.userId));

    await ctx.db
      .update(subscriptions)
      .set({ planId: "free" })
      .where(eq(subscriptions.userId, ctx.userId));

    return { success: true };
  }),
});
