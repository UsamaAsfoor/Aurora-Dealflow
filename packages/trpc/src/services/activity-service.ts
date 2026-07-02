import { and, eq } from "drizzle-orm";
import type { Db } from "@aurora/db";
import { leadActivities, leads } from "@aurora/db";

export async function logActivity(
  db: Db,
  input: {
    leadId: string;
    userId: string;
    type: string;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await db.insert(leadActivities).values({
    leadId: input.leadId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
  });
}

export async function assertLeadOwnership(
  db: Db,
  leadId: string,
  userId: string,
) {
  const check = await db.query.leads.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.id, leadId), eq(table.userId, userId)),
  });

  if (!check) {
    throw new Error("Lead not found");
  }

  return check;
}
