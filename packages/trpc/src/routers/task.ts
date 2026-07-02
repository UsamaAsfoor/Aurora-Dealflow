import { asc, desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { leadTasks } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { assertLeadOwnership, logActivity } from "../services/activity-service.js";

export const taskRouter = router({
  listByLead: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      return ctx.db
        .select()
        .from(leadTasks)
        .where(eq(leadTasks.leadId, input.leadId))
        .orderBy(asc(leadTasks.dueDate), desc(leadTasks.createdAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertLeadOwnership(ctx.db, input.leadId, ctx.userId);

      const inserted = await ctx.db
        .insert(leadTasks)
        .values({
          leadId: input.leadId,
          userId: ctx.userId,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
        })
        .returning();

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "task",
        title: `Task created: ${input.title}`,
        body: input.description,
      });

      return inserted[0];
    }),

  complete: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.query.leadTasks.findFirst({
        where: eq(leadTasks.id, input.taskId),
      });

      if (!task || task.userId !== ctx.userId) {
        throw new Error("Task not found");
      }

      await ctx.db
        .update(leadTasks)
        .set({ completedAt: new Date(), updatedAt: new Date() })
        .where(eq(leadTasks.id, input.taskId));

      await logActivity(ctx.db, {
        leadId: task.leadId,
        userId: ctx.userId,
        type: "task",
        title: `Task completed: ${task.title}`,
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.query.leadTasks.findFirst({
        where: eq(leadTasks.id, input.taskId),
      });

      if (!task || task.userId !== ctx.userId) {
        throw new Error("Task not found");
      }

      await ctx.db.delete(leadTasks).where(eq(leadTasks.id, input.taskId));
      return { success: true };
    }),
});
