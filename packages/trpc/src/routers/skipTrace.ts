import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { skipTraceRequests } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { assertLeadOwnership } from "../services/activity-service.js";
import { DemoSkipTraceService } from "@aurora/integrations";

const skipTrace = new DemoSkipTraceService();

export const skipTraceRouter = router({
  request: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      const [request] = await ctx.db
        .insert(skipTraceRequests)
        .values({
          leadId: input.leadId,
          userId: ctx.userId,
          status: "pending",
          provider: "demo",
        })
        .returning();

      const result = await skipTrace.trace({ leadId: input.leadId });

      const [completed] = await ctx.db
        .update(skipTraceRequests)
        .set({
          status: "completed",
          result,
          completedAt: new Date(),
        })
        .where(eq(skipTraceRequests.id, request!.id))
        .returning();

      return completed;
    }),

  getLatest: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      const rows = await ctx.db
        .select()
        .from(skipTraceRequests)
        .where(eq(skipTraceRequests.leadId, input.leadId))
        .orderBy(desc(skipTraceRequests.createdAt))
        .limit(1);

      return rows[0] ?? null;
    }),
});
