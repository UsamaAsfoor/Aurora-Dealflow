import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  aiAnalyses,
  buyers,
  campaigns,
  conversationMessages,
  dealRooms,
  leadActivities,
  leads,
  leadTasks,
  pipelineStages,
  properties,
  propertyValuations,
} from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";

function startOfDayUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return startOfDayUtc(d);
}

function scoreBand(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const analyticsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const now = new Date();
    const weekAgo = daysAgo(7);
    const twoWeeksAgo = daysAgo(14);
    const day14 = daysAgo(14);

    const [
      [leadTotals],
      [leadsThisWeekRow],
      [leadsPriorWeekRow],
      stageRows,
      [dealAgg],
      [taskOpen],
      [taskOverdue],
      [campaignActive],
      [buyerCount],
      [smsOut7d],
      [smsIn7d],
      scoreRows,
      strategyRows,
      [equityAgg],
      [highEquityRow],
      leadDayRows,
      topLeadRows,
      overdueTaskRows,
      staleLeadRows,
      recentActivityRows,
    ] = await Promise.all([
      ctx.db
        .select({ value: count() })
        .from(leads)
        .where(eq(leads.userId, userId)),

      ctx.db
        .select({ value: count() })
        .from(leads)
        .where(and(eq(leads.userId, userId), gte(leads.createdAt, weekAgo))),

      ctx.db
        .select({ value: count() })
        .from(leads)
        .where(
          and(
            eq(leads.userId, userId),
            gte(leads.createdAt, twoWeeksAgo),
            lt(leads.createdAt, weekAgo),
          ),
        ),

      ctx.db
        .select({
          stageId: pipelineStages.id,
          name: pipelineStages.name,
          color: pipelineStages.color,
          sortOrder: pipelineStages.sortOrder,
          count: sql<number>`count(${leads.id})::int`,
        })
        .from(pipelineStages)
        .leftJoin(
          leads,
          and(
            eq(leads.pipelineStageId, pipelineStages.id),
            eq(leads.userId, userId),
          ),
        )
        .where(
          or(isNull(pipelineStages.userId), eq(pipelineStages.userId, userId)),
        )
        .groupBy(
          pipelineStages.id,
          pipelineStages.name,
          pipelineStages.color,
          pipelineStages.sortOrder,
        )
        .orderBy(asc(pipelineStages.sortOrder)),

      ctx.db
        .select({
          openDeals: sql<number>`count(*)::int`,
          totalArv: sql<string | null>`sum(${dealRooms.arv})`,
          totalMao: sql<string | null>`sum(${dealRooms.mao})`,
          totalAssignmentFee: sql<string | null>`sum(${dealRooms.assignmentFee})`,
        })
        .from(dealRooms)
        .where(eq(dealRooms.userId, userId)),

      ctx.db
        .select({ value: count() })
        .from(leadTasks)
        .where(
          and(eq(leadTasks.userId, userId), isNull(leadTasks.completedAt)),
        ),

      ctx.db
        .select({ value: count() })
        .from(leadTasks)
        .where(
          and(
            eq(leadTasks.userId, userId),
            isNull(leadTasks.completedAt),
            isNotNull(leadTasks.dueDate),
            lt(leadTasks.dueDate, now),
          ),
        ),

      ctx.db
        .select({ value: count() })
        .from(campaigns)
        .where(
          and(
            eq(campaigns.userId, userId),
            eq(campaigns.status, "active"),
            eq(campaigns.isTemplate, false),
          ),
        ),

      ctx.db
        .select({ value: count() })
        .from(buyers)
        .where(eq(buyers.userId, userId)),

      ctx.db
        .select({ value: count() })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.userId, userId),
            eq(conversationMessages.channel, "sms"),
            eq(conversationMessages.direction, "outbound"),
            gte(conversationMessages.createdAt, weekAgo),
          ),
        ),

      ctx.db
        .select({ value: count() })
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.userId, userId),
            eq(conversationMessages.channel, "sms"),
            eq(conversationMessages.direction, "inbound"),
            gte(conversationMessages.createdAt, weekAgo),
          ),
        ),

      ctx.db
        .select({ score: aiAnalyses.score })
        .from(aiAnalyses)
        .innerJoin(leads, eq(leads.propertyId, aiAnalyses.propertyId))
        .where(eq(leads.userId, userId)),

      ctx.db
        .select({
          strategy: aiAnalyses.strategy,
          count: sql<number>`count(*)::int`,
        })
        .from(aiAnalyses)
        .innerJoin(leads, eq(leads.propertyId, aiAnalyses.propertyId))
        .where(eq(leads.userId, userId))
        .groupBy(aiAnalyses.strategy)
        .orderBy(desc(sql`count(*)`)),

      ctx.db
        .select({
          totalEquity: sql<string | null>`sum(${propertyValuations.estimatedEquity})`,
          avgEquityPercent: sql<string | null>`avg(${propertyValuations.equityPercent})`,
        })
        .from(propertyValuations)
        .innerJoin(properties, eq(properties.id, propertyValuations.propertyId))
        .innerJoin(leads, eq(leads.propertyId, properties.id))
        .where(eq(leads.userId, userId)),

      ctx.db
        .select({ value: count() })
        .from(propertyValuations)
        .innerJoin(properties, eq(properties.id, propertyValuations.propertyId))
        .innerJoin(leads, eq(leads.propertyId, properties.id))
        .where(
          and(
            eq(leads.userId, userId),
            gte(propertyValuations.equityPercent, "50"),
          ),
        ),

      ctx.db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${leads.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(leads)
        .where(and(eq(leads.userId, userId), gte(leads.createdAt, day14)))
        .groupBy(sql`date_trunc('day', ${leads.createdAt})`)
        .orderBy(sql`date_trunc('day', ${leads.createdAt})`),

      ctx.db
        .select({
          leadId: leads.id,
          line1: properties.line1,
          city: properties.city,
          state: properties.state,
          zip: properties.zip,
          score: aiAnalyses.score,
          equityPercent: propertyValuations.equityPercent,
          stageName: pipelineStages.name,
          stageColor: pipelineStages.color,
        })
        .from(leads)
        .innerJoin(properties, eq(leads.propertyId, properties.id))
        .innerJoin(pipelineStages, eq(leads.pipelineStageId, pipelineStages.id))
        .leftJoin(aiAnalyses, eq(aiAnalyses.propertyId, properties.id))
        .leftJoin(
          propertyValuations,
          eq(propertyValuations.propertyId, properties.id),
        )
        .where(eq(leads.userId, userId))
        .orderBy(
          sql`${aiAnalyses.score} desc nulls last`,
          desc(leads.updatedAt),
        )
        .limit(8),

      ctx.db
        .select({
          taskId: leadTasks.id,
          title: leadTasks.title,
          dueDate: leadTasks.dueDate,
          leadId: leads.id,
          line1: properties.line1,
          city: properties.city,
          state: properties.state,
        })
        .from(leadTasks)
        .innerJoin(leads, eq(leadTasks.leadId, leads.id))
        .innerJoin(properties, eq(leads.propertyId, properties.id))
        .where(
          and(
            eq(leadTasks.userId, userId),
            isNull(leadTasks.completedAt),
            isNotNull(leadTasks.dueDate),
            lt(leadTasks.dueDate, now),
          ),
        )
        .orderBy(asc(leadTasks.dueDate))
        .limit(6),

      ctx.db
        .select({
          leadId: leads.id,
          line1: properties.line1,
          city: properties.city,
          state: properties.state,
          stageName: pipelineStages.name,
          updatedAt: leads.updatedAt,
        })
        .from(leads)
        .innerJoin(properties, eq(leads.propertyId, properties.id))
        .innerJoin(pipelineStages, eq(leads.pipelineStageId, pipelineStages.id))
        .where(
          and(eq(leads.userId, userId), lt(leads.updatedAt, weekAgo)),
        )
        .orderBy(asc(leads.updatedAt))
        .limit(6),

      ctx.db
        .select({
          id: leadActivities.id,
          type: leadActivities.type,
          title: leadActivities.title,
          body: leadActivities.body,
          createdAt: leadActivities.createdAt,
          leadId: leads.id,
          line1: properties.line1,
          city: properties.city,
          state: properties.state,
        })
        .from(leadActivities)
        .innerJoin(leads, eq(leadActivities.leadId, leads.id))
        .innerJoin(properties, eq(leads.propertyId, properties.id))
        .where(eq(leadActivities.userId, userId))
        .orderBy(desc(leadActivities.createdAt))
        .limit(10),
    ]);

    const totalLeads = leadTotals?.value ?? 0;
    const scored = scoreRows.length;
    const avgScore =
      scored > 0
        ? Math.round(
            scoreRows.reduce((sum, r) => sum + r.score, 0) / scored,
          )
        : null;

    const scoreBands = { high: 0, medium: 0, low: 0, unscored: 0 };
    for (const row of scoreRows) {
      scoreBands[scoreBand(row.score)] += 1;
    }
    scoreBands.unscored = Math.max(0, totalLeads - scored);

    const dayMap = new Map(
      leadDayRows.map((r) => [r.day, Number(r.count)]),
    );
    const leadsByDay: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      leadsByDay.push({ date: key, count: dayMap.get(key) ?? 0 });
    }

    const num = (v: string | null | undefined) =>
      v == null || v === "" ? null : Number(v);

    return {
      kpis: {
        totalLeads,
        leadsThisWeek: leadsThisWeekRow?.value ?? 0,
        leadsPriorWeek: leadsPriorWeekRow?.value ?? 0,
        openDeals: dealAgg?.openDeals ?? 0,
        totalArv: num(dealAgg?.totalArv),
        totalMao: num(dealAgg?.totalMao),
        totalAssignmentFee: num(dealAgg?.totalAssignmentFee),
        avgScore,
        scoredLeads: scored,
        openTasks: taskOpen?.value ?? 0,
        overdueTasks: taskOverdue?.value ?? 0,
        activeCampaigns: campaignActive?.value ?? 0,
        buyers: buyerCount?.value ?? 0,
        smsSent7d: smsOut7d?.value ?? 0,
        smsInbound7d: smsIn7d?.value ?? 0,
      },
      pipeline: stageRows.map((s) => ({
        stageId: s.stageId,
        name: s.name,
        color: s.color,
        count: Number(s.count),
      })),
      leadsByDay,
      scoreBands,
      strategies: strategyRows.map((s) => ({
        strategy: s.strategy,
        count: Number(s.count),
      })),
      equity: {
        totalEstimatedEquity: num(equityAgg?.totalEquity) ?? 0,
        avgEquityPercent: num(equityAgg?.avgEquityPercent),
        highEquityLeads: highEquityRow?.value ?? 0,
      },
      topLeads: topLeadRows.map((r) => ({
        leadId: r.leadId,
        line1: r.line1,
        city: r.city,
        state: r.state,
        zip: r.zip,
        score: r.score,
        equityPercent: num(r.equityPercent),
        stageName: r.stageName,
        stageColor: r.stageColor,
      })),
      attention: {
        overdueTasks: overdueTaskRows.map((t) => ({
          taskId: t.taskId,
          title: t.title,
          dueDate: t.dueDate,
          leadId: t.leadId,
          line1: t.line1,
          city: t.city,
          state: t.state,
        })),
        staleLeads: staleLeadRows.map((l) => ({
          leadId: l.leadId,
          line1: l.line1,
          city: l.city,
          state: l.state,
          stageName: l.stageName,
          updatedAt: l.updatedAt,
          daysSinceUpdate: Math.max(
            0,
            Math.floor(
              (now.getTime() - new Date(l.updatedAt).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          ),
        })),
      },
      recentActivity: recentActivityRows.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt,
        leadId: a.leadId,
        line1: a.line1,
        city: a.city,
        state: a.state,
      })),
    };
  }),
});
