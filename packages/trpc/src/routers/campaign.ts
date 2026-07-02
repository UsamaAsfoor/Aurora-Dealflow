import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  campaignEnrollments,
  campaignSteps,
  campaigns,
  leads,
  properties,
} from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import { logActivity } from "../services/activity-service.js";

export const campaignRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, ctx.userId))
      .orderBy(desc(campaigns.updatedAt));
  }),

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.isTemplate, true))
      .orderBy(campaigns.name);
  }),

  get: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.campaignId),
          eq(campaigns.userId, ctx.userId),
        ),
        with: { steps: true, enrollments: true },
      });

      if (!campaign) throw new Error("Campaign not found");
      return campaign;
    }),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.templateId),
          eq(campaigns.isTemplate, true),
        ),
        with: { steps: true },
      });

      if (!template) throw new Error("Template not found");

      const [created] = await ctx.db
        .insert(campaigns)
        .values({
          userId: ctx.userId,
          name: template.name,
          description: template.description,
          playbookKey: template.playbookKey,
          filterSnapshot: template.filterSnapshot,
          targetStageIds: template.targetStageIds,
          status: "draft",
          isTemplate: false,
        })
        .returning();

      if (template.steps.length > 0) {
        await ctx.db.insert(campaignSteps).values(
          template.steps.map((step) => ({
            campaignId: created!.id,
            sortOrder: step.sortOrder,
            channel: step.channel,
            delayDays: step.delayDays,
            subject: step.subject,
            template: step.template,
          })),
        );
      }

      return created;
    }),

  activate: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(campaigns)
        .set({ status: "active", updatedAt: new Date() })
        .where(
          and(
            eq(campaigns.id, input.campaignId),
            eq(campaigns.userId, ctx.userId),
          ),
        );
      return { success: true };
    }),

  enrollLeads: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        leadIds: z.array(z.string().uuid()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const campaign = await ctx.db.query.campaigns.findFirst({
        where: and(
          eq(campaigns.id, input.campaignId),
          eq(campaigns.userId, ctx.userId),
        ),
        with: { steps: true },
      });

      if (!campaign) throw new Error("Campaign not found");

      const ownedLeads = await ctx.db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.userId, ctx.userId),
            inArray(leads.id, input.leadIds),
          ),
        );

      const firstStep = campaign.steps.sort((a, b) => a.sortOrder - b.sortOrder)[0];
      const nextRun = new Date();
      if (firstStep) {
        nextRun.setDate(nextRun.getDate() + firstStep.delayDays);
      }

      let enrolled = 0;
      for (const lead of ownedLeads) {
        const existing = await ctx.db
          .select({ id: campaignEnrollments.id })
          .from(campaignEnrollments)
          .where(
            and(
              eq(campaignEnrollments.campaignId, input.campaignId),
              eq(campaignEnrollments.leadId, lead.id),
            ),
          )
          .limit(1);

        if (existing[0]) continue;

        await ctx.db.insert(campaignEnrollments).values({
          campaignId: input.campaignId,
          leadId: lead.id,
          status: "active",
          currentStep: 0,
          nextRunAt: nextRun,
        });

        await logActivity(ctx.db, {
          leadId: lead.id,
          userId: ctx.userId,
          type: "campaign",
          title: `Enrolled in campaign: ${campaign.name}`,
        });

        enrolled++;
      }

      return { enrolled };
    }),

  analytics: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          status: campaignEnrollments.status,
          count: sql<number>`count(*)::int`,
        })
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.campaignId, input.campaignId))
        .groupBy(campaignEnrollments.status);

      return {
        enrollments: rows,
        total: rows.reduce((sum, r) => sum + r.count, 0),
      };
    }),
});
