import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { leads, pipelineStages, properties } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import {
  getDefaultPipelineStageId,
  upsertPropertySnapshot,
} from "../services/property-service.js";
import { logActivity } from "../services/activity-service.js";
import {
  checkUsageLimit,
  incrementUsage,
} from "../services/usage-service.js";

export const leadRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: leads.id,
        source: leads.source,
        notes: leads.notes,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        pipelineStageId: leads.pipelineStageId,
        pipelineStageName: pipelineStages.name,
        pipelineStageColor: pipelineStages.color,
        propertyId: leads.propertyId,
        attomId: properties.attomId,
        line1: properties.line1,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
      })
      .from(leads)
      .innerJoin(properties, eq(leads.propertyId, properties.id))
      .innerJoin(pipelineStages, eq(leads.pipelineStageId, pipelineStages.id))
      .where(eq(leads.userId, ctx.userId))
      .orderBy(desc(leads.updatedAt));

    return rows;
  }),

  getById: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.leads.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.id, input.leadId), eq(table.userId, ctx.userId)),
        with: {
          property: {
            with: {
              owner: true,
              valuation: true,
              tax: true,
            },
          },
          pipelineStage: true,
        },
      });

      if (!row) {
        throw new Error("Lead not found");
      }

      return row;
    }),

  createFromProperty: protectedProcedure
    .input(
      z.object({
        attomId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkUsageLimit(ctx.db, ctx.userId, "leads");

      const property = await ctx.attom.getFullProperty(input.attomId);
      const propertyId = await upsertPropertySnapshot(ctx.db, property);
      const defaultStageId = await getDefaultPipelineStageId(ctx.db);

      const existingLead = await ctx.db
        .select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.propertyId, propertyId), eq(leads.userId, ctx.userId)))
        .limit(1);

      if (existingLead[0]) {
        return { leadId: existingLead[0].id, propertyId, isNew: false };
      }

      const inserted = await ctx.db
        .insert(leads)
        .values({
          userId: ctx.userId,
          propertyId,
          pipelineStageId: defaultStageId,
          source: "search",
          notes: input.notes,
        })
        .returning({ id: leads.id });

      await incrementUsage(ctx.db, ctx.userId, "leads");

      await logActivity(ctx.db, {
        leadId: inserted[0]!.id,
        userId: ctx.userId,
        type: "lead",
        title: "Lead saved from search",
      });

      return {
        leadId: inserted[0]!.id,
        propertyId,
        isNew: true,
      };
    }),

  assign: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        assignedToUserId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.db.query.leads.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.id, input.leadId), eq(table.userId, ctx.userId)),
      });

      if (!lead) throw new Error("Lead not found");

      await ctx.db
        .update(leads)
        .set({
          assignedToUserId: input.assignedToUserId,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      await logActivity(ctx.db, {
        leadId: input.leadId,
        userId: ctx.userId,
        type: "assignment",
        title: input.assignedToUserId
          ? "Lead assigned"
          : "Lead unassigned",
      });

      return { success: true };
    }),

  updateNotes: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        notes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(leads)
        .set({ notes: input.notes, updatedAt: new Date() })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),
});
