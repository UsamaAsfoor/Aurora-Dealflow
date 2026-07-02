import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { leadActivities } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { assertLeadOwnership, logActivity } from "../services/activity-service.js";

export const activityRouter = router({
  listByLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      return ctx.db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, input.leadId))
        .orderBy(desc(leadActivities.createdAt));
    }),

  createNote: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        title: z.string().min(1).default("Note"),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "note",
        title: input.title,
        body: input.body,
      });

      return { success: true };
    }),
});
