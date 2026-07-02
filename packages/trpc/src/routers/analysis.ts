import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  formatAddress,
  propertySignalsFromNormalized,
  type DealStrategy,
} from "@aurora/core";
import { computeOpportunityScore } from "@aurora/core/scoring";
import { aiAnalyses } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";
import {
  getAnalysisByAttomId,
  getAnalysisForProperty,
  propertyFromDb,
  upsertPropertySnapshot,
} from "../services/property-service.js";

export const analysisRouter = router({
  getOrGenerate: protectedProcedure
    .input(
      z.object({
        attomId: z.string().optional(),
        propertyId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.attomId) {
        const cached = await getAnalysisByAttomId(ctx.db, input.attomId);
        if (cached) {
          return {
            score: cached.score,
            breakdown: cached.signals,
            summary: cached.summary,
            strategy: cached.strategy,
            reasoning: cached.reasoning,
            propertyId: cached.propertyId,
          };
        }
      }

      if (input.propertyId) {
        const cached = await getAnalysisForProperty(ctx.db, input.propertyId);
        if (cached) {
          return {
            score: cached.score,
            breakdown: cached.signals,
            summary: cached.summary,
            strategy: cached.strategy,
            reasoning: cached.reasoning,
            propertyId: cached.propertyId,
          };
        }
      }

      let property;
      let propertyId = input.propertyId;

      if (input.leadId) {
        const lead = await ctx.db.query.leads.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.id, input.leadId!), eq(table.userId, ctx.userId)),
        });
        if (!lead) throw new Error("Lead not found");
        propertyId = lead.propertyId;
      }

      if (propertyId) {
        property = await propertyFromDb(ctx.db, propertyId);
      } else if (input.attomId) {
        property = await ctx.attom.getFullProperty(input.attomId);
        propertyId = await upsertPropertySnapshot(ctx.db, property);
      } else {
        throw new Error("attomId, propertyId, or leadId required");
      }

      if (!property) throw new Error("Property not found");

      const signals = propertySignalsFromNormalized(property);
      const scoreResult = computeOpportunityScore(signals);
      const propertySummary = formatAddress(property.address);
      const analysis = await ctx.openai.generateAnalysis(
        signals,
        scoreResult,
        propertySummary,
      );

      await ctx.db.insert(aiAnalyses).values({
        propertyId,
        attomId: property.attomId,
        score: analysis.score,
        signals: analysis.breakdown,
        summary: analysis.summary,
        strategy: analysis.strategy,
        reasoning: analysis.reasoning,
      });

      return { ...analysis, propertyId };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        attomId: z.string().optional(),
        propertyId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let property;
      let propertyId = input.propertyId;

      if (input.leadId) {
        const lead = await ctx.db.query.leads.findFirst({
          where: (table, { and, eq }) =>
            and(eq(table.id, input.leadId!), eq(table.userId, ctx.userId)),
        });
        if (!lead) throw new Error("Lead not found");
        propertyId = lead.propertyId;
      }

      if (propertyId) {
        property = await propertyFromDb(ctx.db, propertyId);
      } else if (input.attomId) {
        property = await ctx.attom.getFullProperty(input.attomId);
        propertyId = await upsertPropertySnapshot(ctx.db, property);
      } else {
        throw new Error("attomId, propertyId, or leadId required");
      }

      if (!property) {
        throw new Error("Property not found");
      }

      const existing = input.attomId
        ? await getAnalysisByAttomId(ctx.db, input.attomId)
        : await getAnalysisForProperty(ctx.db, propertyId);

      if (existing) {
        return {
          score: existing.score,
          breakdown: existing.signals as ReturnType<
            typeof computeOpportunityScore
          >["breakdown"],
          summary: existing.summary,
          strategy: existing.strategy as DealStrategy,
          reasoning: existing.reasoning,
          propertyId,
        };
      }

      const signals = propertySignalsFromNormalized(property);
      const scoreResult = computeOpportunityScore(signals);
      const propertySummary = formatAddress(property.address);

      const analysis = await ctx.openai.generateAnalysis(
        signals,
        scoreResult,
        propertySummary,
      );

      await ctx.db
        .insert(aiAnalyses)
        .values({
          propertyId,
          attomId: property.attomId,
          score: analysis.score,
          signals: analysis.breakdown,
          summary: analysis.summary,
          strategy: analysis.strategy,
          reasoning: analysis.reasoning,
        })
        .onConflictDoNothing();

      return { ...analysis, propertyId };
    }),

  get: protectedProcedure
    .input(
      z.object({
        attomId: z.string().optional(),
        propertyId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.propertyId) {
        const analysis = await getAnalysisForProperty(ctx.db, input.propertyId);
        if (!analysis) return null;
        return {
          score: analysis.score,
          breakdown: analysis.signals,
          summary: analysis.summary,
          strategy: analysis.strategy,
          reasoning: analysis.reasoning,
        };
      }

      if (input.attomId) {
        const analysis = await getAnalysisByAttomId(ctx.db, input.attomId);
        if (!analysis) return null;
        return {
          score: analysis.score,
          breakdown: analysis.signals,
          summary: analysis.summary,
          strategy: analysis.strategy,
          reasoning: analysis.reasoning,
        };
      }

      return null;
    }),

  batchScores: protectedProcedure
    .input(
      z.object({
        attomIds: z.array(z.string()).max(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const scores: Record<string, number> = {};

      await Promise.all(
        input.attomIds.map(async (attomId) => {
          const cached = await getAnalysisByAttomId(ctx.db, attomId);
          if (cached) {
            scores[attomId] = cached.score;
            return;
          }

          const property = await ctx.attom.getFullProperty(attomId);
          const signals = propertySignalsFromNormalized(property);
          scores[attomId] = computeOpportunityScore(signals).score;
        }),
      );

      return scores;
    }),
});
