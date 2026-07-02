import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  campaigns,
  leads,
  subscriptions,
  usageRecords,
  users,
} from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";

function isAdmin(email: string | null) {
  if (!email) return false;
  const admins =
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  if (admins.length > 0) {
    return admins.includes(email);
  }
  return email.endsWith("@auroradealflow.com");
}

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isAdmin(ctx.userEmail)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [userCount] = await ctx.db.select({ value: count() }).from(users);
    const [leadCount] = await ctx.db.select({ value: count() }).from(leads);
    const [campaignCount] = await ctx.db
      .select({ value: count() })
      .from(campaigns);
    const [activeSubs] = await ctx.db
      .select({ value: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    return {
      users: userCount?.value ?? 0,
      leads: leadCount?.value ?? 0,
      campaigns: campaignCount?.value ?? 0,
      activeSubscriptions: activeSubs?.value ?? 0,
      demoMode: process.env.ATTOM_USE_DEMO === "true",
    };
  }),

  listUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(100);
  }),

  getUserUsage: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.userId, input.userId))
        .orderBy(desc(usageRecords.updatedAt))
        .limit(20);

      return rows;
    }),
});
