import { z } from "zod";
import { computeSearchResultScore } from "@aurora/core/scoring";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

const searchFiltersSchema = z.object({
  propertyTypes: z
    .array(
      z.enum([
        "single_family",
        "multi_family",
        "condo",
        "townhouse",
        "land",
        "commercial",
        "other",
      ]),
    )
    .optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minEquityPercent: z.number().optional(),
  maxEquityPercent: z.number().optional(),
  minOwnershipYears: z.number().optional(),
  absenteeOnly: z.boolean().optional(),
  vacantOnly: z.boolean().optional(),
  preForeclosureOnly: z.boolean().optional(),
  taxDelinquentOnly: z.boolean().optional(),
  recentlySoldDays: z.number().optional(),
  minScore: z.number().optional(),
  searchMode: z
    .enum([
      "list_building",
      "vacant",
      "absentee",
      "pre_foreclosure",
      "tax_delinquent",
      "expired_listings",
      "mls_lookup",
      "emls",
      "specific_property",
      "radius_search",
    ])
    .optional(),
  mlsNumber: z.string().optional(),
  listingStatus: z.string().optional(),
  emlsStatus: z.string().optional(),
  minDaysExpired: z.number().optional(),
  minVacancyMonths: z.number().optional(),
  outOfStateOnly: z.boolean().optional(),
  minDelinquentAmount: z.number().optional(),
  minDelinquentYears: z.number().optional(),
});

const searchInputSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  county: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMiles: z.number().optional(),
  polygon: z
    .array(z.object({ lat: z.number(), lng: z.number() }))
    .optional(),
  bounds: z
    .object({
      north: z.number(),
      south: z.number(),
      east: z.number(),
      west: z.number(),
    })
    .optional(),
  filters: searchFiltersSchema.optional(),
  sortBy: z.enum(["distance", "price", "equity", "score"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

function applyClientFilters<
  T extends {
    estimatedValue: number | null;
    equityPercent: number | null;
    isAbsentee: boolean;
    isVacant: boolean;
    isPreForeclosure: boolean;
    isTaxDelinquent: boolean;
    score?: number;
    mlsNumber?: string | null;
    listingStatus?: string | null;
    emlsStatus?: string | null;
    daysExpired?: number | null;
    vacancyMonths?: number | null;
    isExpiredListing?: boolean;
    isEmlsListing?: boolean;
  },
>(results: T[], filters?: z.infer<typeof searchFiltersSchema>): T[] {
  if (!filters) return results;

  return results.filter((result) => {
    if (filters.minPrice != null && (result.estimatedValue ?? 0) < filters.minPrice) {
      return false;
    }
    if (
      filters.maxPrice != null &&
      (result.estimatedValue ?? Infinity) > filters.maxPrice
    ) {
      return false;
    }
    if (
      filters.minEquityPercent != null &&
      (result.equityPercent ?? 0) < filters.minEquityPercent
    ) {
      return false;
    }
    if (
      filters.maxEquityPercent != null &&
      (result.equityPercent ?? 100) > filters.maxEquityPercent
    ) {
      return false;
    }
    if (filters.absenteeOnly && !result.isAbsentee) return false;
    if (filters.vacantOnly && !result.isVacant) return false;
    if (filters.preForeclosureOnly && !result.isPreForeclosure) return false;
    if (filters.taxDelinquentOnly && !result.isTaxDelinquent) return false;
    if (filters.minScore != null && (result.score ?? 0) < filters.minScore) {
      return false;
    }
    if (
      filters.mlsNumber &&
      !result.mlsNumber?.toLowerCase().includes(filters.mlsNumber.toLowerCase())
    ) {
      return false;
    }
    if (
      filters.listingStatus &&
      result.listingStatus !== filters.listingStatus
    ) {
      return false;
    }
    if (filters.emlsStatus && result.emlsStatus !== filters.emlsStatus) {
      return false;
    }
    if (
      filters.minDaysExpired != null &&
      (result.daysExpired ?? 0) < filters.minDaysExpired
    ) {
      return false;
    }
    if (
      filters.minVacancyMonths != null &&
      (result.vacancyMonths ?? 0) < filters.minVacancyMonths
    ) {
      return false;
    }
    if (filters.searchMode === "expired_listings" && !result.isExpiredListing) {
      return false;
    }
    if (filters.searchMode === "emls" && !result.isEmlsListing) {
      return false;
    }
    return true;
  });
}

function sortResults<
  T extends {
    estimatedValue: number | null;
    equityPercent: number | null;
    score?: number;
  },
>(
  results: T[],
  sortBy?: "distance" | "price" | "equity" | "score",
  sortOrder: "asc" | "desc" = "desc",
): T[] {
  const sorted = [...results];
  const direction = sortOrder === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    if (sortBy === "score") {
      return ((a.score ?? 0) - (b.score ?? 0)) * direction * -1;
    }
    if (sortBy === "price") {
      return ((a.estimatedValue ?? 0) - (b.estimatedValue ?? 0)) * direction * -1;
    }
    if (sortBy === "equity") {
      return ((a.equityPercent ?? 0) - (b.equityPercent ?? 0)) * direction * -1;
    }
    return 0;
  });

  return sorted;
}

export const propertyRouter = router({
  search: protectedProcedure.input(searchInputSchema).query(async ({ ctx, input }) => {
    let results = await ctx.attom.searchProperties(input);
    results = results.map((result) => ({
      ...result,
      score:
        result.score ??
        computeSearchResultScore({
          attomId: result.attomId,
          equityPercent: result.equityPercent,
          ownershipYears: null,
          isAbsentee: result.isAbsentee,
          isVacant: result.isVacant,
          isPreForeclosure: result.isPreForeclosure,
          isTaxDelinquent: result.isTaxDelinquent,
        }),
    }));

    const filters = { ...input.filters };
    if (!ctx.attom.isDemoMode()) {
      // Live /property/snapshot often lacks these flags — don't wipe the list
      delete filters.vacantOnly;
      delete filters.minVacancyMonths;
      delete filters.preForeclosureOnly;
      delete filters.taxDelinquentOnly;
      delete filters.minDelinquentAmount;
      delete filters.minDelinquentYears;
      delete filters.outOfStateOnly;
      delete filters.minOwnershipYears;
      // Snapshot rarely includes equity; treating null as 0 would empty the list
      delete filters.minEquityPercent;
      delete filters.maxEquityPercent;
      // Absentee was already requested from ATTOM via absenteeowner=absentee
      if (filters.absenteeOnly) {
        results = results.map((result) => ({ ...result, isAbsentee: true }));
      }
      // These modes are demo-only stubs until listing data is wired
      if (
        filters.searchMode === "expired_listings" ||
        filters.searchMode === "emls" ||
        filters.searchMode === "mls_lookup"
      ) {
        delete filters.searchMode;
        delete filters.minDaysExpired;
        delete filters.mlsNumber;
        delete filters.listingStatus;
        delete filters.emlsStatus;
      }
    }

    results = applyClientFilters(results, filters);
    results = sortResults(results, input.sortBy, input.sortOrder);

    return {
      results,
      total: results.length,
      isDemoMode: ctx.attom.isDemoMode(),
    };
  }),

  getByAttomId: protectedProcedure
    .input(z.object({ attomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const property = await ctx.attom.getFullProperty(input.attomId);
      return property;
    }),

  getComps: protectedProcedure
    .input(z.object({ attomId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.attom.getComps(input.attomId);
    }),

  getByLeadId: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { propertyFromDb } = await import("../services/property-service.js");
      const lead = await ctx.db.query.leads.findFirst({
        where: (leads, { and, eq }) =>
          and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)),
        with: { pipelineStage: true },
      });

      if (!lead) {
        throw new Error("Lead not found");
      }

      const property = await propertyFromDb(ctx.db, lead.propertyId);
      if (!property) {
        throw new Error("Property not found");
      }

      return {
        property,
        lead: {
          id: lead.id,
          source: lead.source,
          notes: lead.notes,
          createdAt: lead.createdAt,
          pipelineStageName: lead.pipelineStage.name,
          pipelineStageColor: lead.pipelineStage.color,
        },
      };
    }),

  status: publicProcedure.query(({ ctx }) => ({
    isDemoMode: ctx.attom.isDemoMode(),
  })),
});
