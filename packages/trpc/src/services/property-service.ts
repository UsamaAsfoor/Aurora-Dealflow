import { eq } from "drizzle-orm";
import type { NormalizedProperty } from "@aurora/core";
import type { Db } from "@aurora/db";
import {
  aiAnalyses,
  pipelineStages,
  properties,
  propertyComps,
  propertyMortgages,
  propertyOwners,
  propertySales,
  propertyTaxes,
  propertyValuations,
} from "@aurora/db";

function toNumeric(value: number | null | undefined): string | null {
  return value == null ? null : String(value);
}

export async function upsertPropertySnapshot(
  db: Db,
  property: NormalizedProperty,
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.attomId, property.attomId))
      .limit(1);

    let propertyId = existing[0]?.id;

    const propertyValues = {
      attomId: property.attomId,
      line1: property.address.line1,
      line2: property.address.line2,
      city: property.address.city,
      state: property.address.state,
      zip: property.address.zip,
      county: property.address.county,
      latitude: String(property.latitude),
      longitude: String(property.longitude),
      location: `SRID=4326;POINT(${property.longitude} ${property.latitude})`,
      propertyType: property.propertyType,
      beds: property.beds,
      baths: toNumeric(property.baths),
      sqft: property.sqft,
      lotSqft: property.lotSqft,
      yearBuilt: property.yearBuilt,
      isVacant: property.isVacant,
      isPreForeclosure: property.isPreForeclosure,
      ownershipYears: property.ownershipYears,
      rawData: property,
      updatedAt: new Date(),
    };

    if (propertyId) {
      await tx
        .update(properties)
        .set(propertyValues)
        .where(eq(properties.id, propertyId));
    } else {
      const inserted = await tx
        .insert(properties)
        .values(propertyValues)
        .returning({ id: properties.id });
      propertyId = inserted[0]!.id;
    }

    await tx.delete(propertyOwners).where(eq(propertyOwners.propertyId, propertyId));
    await tx
      .delete(propertyValuations)
      .where(eq(propertyValuations.propertyId, propertyId));
    await tx
      .delete(propertyMortgages)
      .where(eq(propertyMortgages.propertyId, propertyId));
    await tx.delete(propertyTaxes).where(eq(propertyTaxes.propertyId, propertyId));
    await tx.delete(propertySales).where(eq(propertySales.propertyId, propertyId));
    await tx.delete(propertyComps).where(eq(propertyComps.propertyId, propertyId));

    if (property.owner) {
      await tx.insert(propertyOwners).values({
        propertyId,
        name: property.owner.name,
        mailingLine1: property.owner.mailingAddress.line1,
        mailingLine2: property.owner.mailingAddress.line2,
        mailingCity: property.owner.mailingAddress.city,
        mailingState: property.owner.mailingAddress.state,
        mailingZip: property.owner.mailingAddress.zip,
        isAbsentee: property.owner.isAbsentee,
      });
    }

    await tx.insert(propertyValuations).values({
      propertyId,
      avm: toNumeric(property.valuation.avm),
      assessedValue: toNumeric(property.valuation.assessedValue),
      estimatedMortgageBalance: toNumeric(property.valuation.estimatedMortgageBalance),
      estimatedEquity: toNumeric(property.valuation.estimatedEquity),
      equityPercent: toNumeric(property.valuation.equityPercent),
    });

    if (property.valuation.estimatedMortgageBalance != null) {
      await tx.insert(propertyMortgages).values({
        propertyId,
        balanceEstimate: toNumeric(property.valuation.estimatedMortgageBalance),
      });
    }

    await tx.insert(propertyTaxes).values({
      propertyId,
      annualAmount: toNumeric(property.tax.annualAmount),
      isDelinquent: property.tax.isDelinquent,
      delinquentAmount: toNumeric(property.tax.delinquentAmount),
    });

    if (property.sales.length > 0) {
      await tx.insert(propertySales).values(
        property.sales.map((sale) => ({
          propertyId,
          saleDate: sale.saleDate ? new Date(sale.saleDate) : null,
          salePrice: toNumeric(sale.salePrice),
          saleType: sale.saleType,
        })),
      );
    }

    if (property.comps.length > 0) {
      await tx.insert(propertyComps).values(
        property.comps.map((comp) => ({
          propertyId,
          compAttomId: comp.attomId,
          line1: comp.address.line1,
          city: comp.address.city,
          state: comp.address.state,
          zip: comp.address.zip,
          saleDate: comp.saleDate ? new Date(comp.saleDate) : null,
          salePrice: toNumeric(comp.salePrice),
          distanceMiles: toNumeric(comp.distanceMiles),
          beds: comp.beds,
          baths: toNumeric(comp.baths),
          sqft: comp.sqft,
        })),
      );
    }

    return propertyId;
  });
}

export async function propertyFromDb(
  db: Db,
  propertyId: string,
): Promise<NormalizedProperty | null> {
  const rows = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    with: {
      owner: true,
      valuation: true,
      mortgage: true,
      tax: true,
      sales: true,
      comps: true,
    },
  });

  if (!rows) return null;

  return {
    attomId: rows.attomId,
    address: {
      line1: rows.line1,
      line2: rows.line2 ?? undefined,
      city: rows.city,
      state: rows.state,
      zip: rows.zip,
      county: rows.county ?? undefined,
    },
    latitude: Number(rows.latitude),
    longitude: Number(rows.longitude),
    propertyType: rows.propertyType as NormalizedProperty["propertyType"],
    beds: rows.beds,
    baths: rows.baths ? Number(rows.baths) : null,
    sqft: rows.sqft,
    lotSqft: rows.lotSqft,
    yearBuilt: rows.yearBuilt,
    owner: rows.owner
      ? {
          name: rows.owner.name,
          mailingAddress: {
            line1: rows.owner.mailingLine1,
            line2: rows.owner.mailingLine2 ?? undefined,
            city: rows.owner.mailingCity,
            state: rows.owner.mailingState,
            zip: rows.owner.mailingZip,
          },
          isAbsentee: rows.owner.isAbsentee,
        }
      : null,
    valuation: {
      avm: rows.valuation?.avm ? Number(rows.valuation.avm) : null,
      assessedValue: rows.valuation?.assessedValue
        ? Number(rows.valuation.assessedValue)
        : null,
      estimatedMortgageBalance: rows.valuation?.estimatedMortgageBalance
        ? Number(rows.valuation.estimatedMortgageBalance)
        : null,
      estimatedEquity: rows.valuation?.estimatedEquity
        ? Number(rows.valuation.estimatedEquity)
        : null,
      equityPercent: rows.valuation?.equityPercent
        ? Number(rows.valuation.equityPercent)
        : null,
    },
    tax: {
      annualAmount: rows.tax?.annualAmount ? Number(rows.tax.annualAmount) : null,
      isDelinquent: rows.tax?.isDelinquent ?? false,
      delinquentAmount: rows.tax?.delinquentAmount
        ? Number(rows.tax.delinquentAmount)
        : null,
    },
    sales: rows.sales.map((sale) => ({
      saleDate: sale.saleDate?.toISOString() ?? null,
      salePrice: sale.salePrice ? Number(sale.salePrice) : null,
      saleType: sale.saleType,
    })),
    comps: rows.comps.map((comp) => ({
      attomId: comp.compAttomId,
      address: {
        line1: comp.line1,
        city: comp.city,
        state: comp.state,
        zip: comp.zip,
      },
      saleDate: comp.saleDate?.toISOString() ?? null,
      salePrice: comp.salePrice ? Number(comp.salePrice) : null,
      distanceMiles: comp.distanceMiles ? Number(comp.distanceMiles) : null,
      beds: comp.beds,
      baths: comp.baths ? Number(comp.baths) : null,
      sqft: comp.sqft,
    })),
    isVacant: rows.isVacant,
    isPreForeclosure: rows.isPreForeclosure,
    ownershipYears: rows.ownershipYears,
  };
}

export async function getDefaultPipelineStageId(db: Db): Promise<string> {
  const stage = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(eq(pipelineStages.isDefault, true))
    .limit(1);

  if (!stage[0]) {
    throw new Error("Default pipeline stage not found. Run db:seed.");
  }

  return stage[0].id;
}

export async function getAnalysisForProperty(
  db: Db,
  propertyId: string,
) {
  return db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.propertyId, propertyId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function getAnalysisByAttomId(db: Db, attomId: string) {
  return db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.attomId, attomId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}
