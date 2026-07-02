import { asc, desc, eq, or, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { leads, pipelineStages, properties } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { logActivity } from "../services/activity-service.js";

export const pipelineRouter = router({
  listStages: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(pipelineStages)
      .where(
        or(
          isNull(pipelineStages.userId),
          eq(pipelineStages.userId, ctx.userId),
        ),
      )
      .orderBy(asc(pipelineStages.sortOrder));
  }),

  listBoard: protectedProcedure.query(async ({ ctx }) => {
    const stages = await ctx.db
      .select()
      .from(pipelineStages)
      .where(
        or(
          isNull(pipelineStages.userId),
          eq(pipelineStages.userId, ctx.userId),
        ),
      )
      .orderBy(asc(pipelineStages.sortOrder));

    const leadRows = await ctx.db
      .select({
        id: leads.id,
        pipelineStageId: leads.pipelineStageId,
        source: leads.source,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        attomId: properties.attomId,
        line1: properties.line1,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
      })
      .from(leads)
      .innerJoin(properties, eq(leads.propertyId, properties.id))
      .where(eq(leads.userId, ctx.userId))
      .orderBy(desc(leads.updatedAt));

    return stages.map((stage) => ({
      ...stage,
      leads: leadRows.filter((l) => l.pipelineStageId === stage.id),
    }));
  }),

  createStage: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ sortOrder: pipelineStages.sortOrder })
        .from(pipelineStages)
        .where(eq(pipelineStages.userId, ctx.userId))
        .orderBy(desc(pipelineStages.sortOrder))
        .limit(1);

      const sortOrder = (existing[0]?.sortOrder ?? 9) + 1;

      const inserted = await ctx.db
        .insert(pipelineStages)
        .values({
          userId: ctx.userId,
          name: input.name,
          color: input.color ?? "#64748b",
          sortOrder,
          isDefault: false,
        })
        .returning();

      return inserted[0];
    }),

  updateStage: protectedProcedure
    .input(
      z.object({
        stageId: z.string().uuid(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(pipelineStages)
        .set({
          name: input.name,
          color: input.color,
        })
        .where(
          and(
            eq(pipelineStages.id, input.stageId),
            eq(pipelineStages.userId, ctx.userId),
          ),
        );

      return { success: true };
    }),

  reorderStages: protectedProcedure
    .input(z.object({ stageIds: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      for (let i = 0; i < input.stageIds.length; i++) {
        await ctx.db
          .update(pipelineStages)
          .set({ sortOrder: i })
          .where(
            and(
              eq(pipelineStages.id, input.stageIds[i]!),
              eq(pipelineStages.userId, ctx.userId),
            ),
          );
      }
      return { success: true };
    }),

  moveLead: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        stageId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.id, input.leadId), eq(table.userId, ctx.userId)),
        with: { pipelineStage: true },
      });

      if (!lead) throw new Error("Lead not found");

      const newStage = await ctx.db.query.pipelineStages.findFirst({
        where: eq(pipelineStages.id, input.stageId),
      });

      if (!newStage) throw new Error("Stage not found");

      await ctx.db
        .update(leads)
        .set({
          pipelineStageId: input.stageId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "stage_change",
        title: `Moved to ${newStage.name}`,
        body: `From ${lead.pipelineStage.name} to ${newStage.name}`,
        metadata: {
          fromStageId: lead.pipelineStageId,
          toStageId: input.stageId,
        },
      });

      return { success: true };
    }),
});
