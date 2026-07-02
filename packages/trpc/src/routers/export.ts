import { eq } from "drizzle-orm";
import { z } from "zod";
import { leads, pipelineStages, properties } from "@aurora/db";
import { protectedProcedure, router } from "../trpc.js";

function escapeCsv(value: string | number | null | undefined) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const exportRouter = router({
  leadsCsv: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: leads.id,
        line1: properties.line1,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
        stage: pipelineStages.name,
        source: leads.source,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .innerJoin(properties, eq(leads.propertyId, properties.id))
      .innerJoin(pipelineStages, eq(leads.pipelineStageId, pipelineStages.id))
      .where(eq(leads.userId, ctx.userId));

    const header = [
      "Lead ID",
      "Address",
      "City",
      "State",
      "ZIP",
      "Stage",
      "Source",
      "Created",
    ].join(",");

    const lines = rows.map((row) =>
      [
        row.id,
        row.line1,
        row.city,
        row.state,
        row.zip,
        row.stage,
        row.source,
        row.createdAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(","),
    );

    return { filename: "leads-export.csv", content: [header, ...lines].join("\n") };
  }),

  leadsJson: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.leads.findMany({
      where: eq(leads.userId, ctx.userId),
      with: {
        property: true,
        pipelineStage: true,
      },
    });

    return rows;
  }),
});
