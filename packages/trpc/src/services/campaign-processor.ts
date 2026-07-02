import { and, eq, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@aurora/db";
import {
  campaignEnrollments,
  campaignSteps,
  campaigns,
  conversationMessages,
  leads,
} from "@aurora/db";
import { logActivity } from "./activity-service.js";

export async function processDueCampaignSteps(db: Db) {
  const now = new Date();
  const due = await db
    .select({
      enrollment: campaignEnrollments,
      campaign: campaigns,
    })
    .from(campaignEnrollments)
    .innerJoin(campaigns, eq(campaignEnrollments.campaignId, campaigns.id))
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        lte(campaignEnrollments.nextRunAt, now),
        isNull(campaignEnrollments.pausedAt),
      ),
    )
    .limit(50);

  let processed = 0;

  for (const { enrollment, campaign } of due) {
    const steps = await db
      .select()
      .from(campaignSteps)
      .where(eq(campaignSteps.campaignId, campaign.id))
      .orderBy(campaignSteps.sortOrder);

    const step = steps[enrollment.currentStep];
    if (!step) {
      await db
        .update(campaignEnrollments)
        .set({ status: "completed", completedAt: now, nextRunAt: null })
        .where(eq(campaignEnrollments.id, enrollment.id));
      processed++;
      continue;
    }

    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, enrollment.leadId),
    });

    if (!lead) continue;

    const body = step.template.replace(/\{\{owner\}\}/g, "Property Owner");

    await db.insert(conversationMessages).values({
      leadId: enrollment.leadId,
      userId: campaign.userId,
      channel: step.channel,
      direction: "outbound",
      body,
      status: "sent",
      metadata: { campaignId: campaign.id, stepId: step.id },
    });

    await logActivity(db, {
      leadId: enrollment.leadId,
      userId: campaign.userId,
      type: step.channel,
      title: `Campaign: ${campaign.name}`,
      body,
      metadata: { campaignId: campaign.id, step: enrollment.currentStep },
    });

    const nextStepIndex = enrollment.currentStep + 1;
    const nextStep = steps[nextStepIndex];

    if (nextStep) {
      const nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + nextStep.delayDays);
      await db
        .update(campaignEnrollments)
        .set({
          currentStep: nextStepIndex,
          nextRunAt: nextRun,
        })
        .where(eq(campaignEnrollments.id, enrollment.id));
    } else {
      await db
        .update(campaignEnrollments)
        .set({
          status: "completed",
          completedAt: now,
          nextRunAt: null,
        })
        .where(eq(campaignEnrollments.id, enrollment.id));
    }

    processed++;
  }

  return processed;
}

export async function pauseEnrollmentsOnReply(db: Db, leadId: string) {
  await db
    .update(campaignEnrollments)
    .set({ pausedAt: new Date(), status: "paused" })
    .where(
      and(
        eq(campaignEnrollments.leadId, leadId),
        eq(campaignEnrollments.status, "active"),
      ),
    );
}
