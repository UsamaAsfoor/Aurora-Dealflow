import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_FETCH,
  computeCompsAnalysis,
} from "@aurora/core";
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
  lookupMode: z.enum(["area", "address"]).optional(),
  filters: searchFiltersSchema.optional(),
  sortBy: z.enum(["distance", "price", "equity", "score"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().min(1).max(MAX_SEARCH_FETCH).optional(),
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
    const page = await ctx.attom.searchProperties({
      ...input,
      limit: input.limit ?? DEFAULT_SEARCH_LIMIT,
    });
    let results = page.results.map((result) => ({
      ...result,
      score:
        result.score ??
        computeSearchResultScore({
          attomId: result.attomId,
          equityPercent: result.equityPercent,
          ownershipYears: result.ownershipYears ?? null,
          isAbsentee: result.isAbsentee,
          isVacant: result.isVacant,
          isPreForeclosure: result.isPreForeclosure,
          isTaxDelinquent: result.isTaxDelinquent,
        }),
    }));

    const filters = { ...input.filters };
    if (!ctx.attom.isDemoMode()) {
      // Live packages often lack these flags — don't wipe the list
      delete filters.vacantOnly;
      delete filters.minVacancyMonths;
      delete filters.preForeclosureOnly;
      delete filters.taxDelinquentOnly;
      delete filters.minDelinquentAmount;
      delete filters.minDelinquentYears;
      delete filters.outOfStateOnly;
      delete filters.minOwnershipYears;
      // Equity rarely present on list packages; null≠0
      delete filters.minEquityPercent;
      delete filters.maxEquityPercent;
      // Price already applied server-side on AVM package when possible
      if (filters.minPrice != null || filters.maxPrice != null) {
        // Keep light client filter for non-AVM packages
      }
      if (filters.absenteeOnly) {
        results = results.map((result) => ({ ...result, isAbsentee: true }));
      }
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

    const lookupMode =
      input.lookupMode ??
      (input.query?.trim() && !input.zip && !input.city && !input.county
        ? "address"
        : "area");

    const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
    const offset = input.offset ?? 0;

    return {
      results,
      /** Filtered count in this response */
      total: results.length,
      /** ATTOM universe total for the geo/query (before local filters) */
      totalAvailable: page.total,
      fetched: results.length,
      pageSize: page.pageSize,
      hasMore: page.hasMore || offset + results.length < page.total,
      limit,
      offset,
      lookupMode,
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
    .input(
      z.object({
        attomId: z.string(),
        radiusMiles: z.number().min(1).max(5).default(1),
        soldWithinMonths: z.union([z.literal(3), z.literal(6), z.literal(12)]).default(6),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [comps, subject] = await Promise.all([
        ctx.attom.getComps(input.attomId, {
          radiusMiles: input.radiusMiles,
          soldWithinMonths: input.soldWithinMonths,
        }),
        ctx.attom.getPropertyDetail(input.attomId).catch(() => null),
      ]);

      return computeCompsAnalysis(comps, {
        radiusMiles: input.radiusMiles,
        soldWithinMonths: input.soldWithinMonths,
        subjectSqft: subject?.sqft ?? null,
      });
    }),

  getByLeadId: protectedProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { propertyFromDb, upsertPropertyOwner } = await import(
        "../services/property-service.js"
      );
      const lead = await ctx.db.query.leads.findFirst({
        where: (leads, { and, eq }) =>
          and(eq(leads.id, input.leadId), eq(leads.userId, ctx.userId)),
        with: { pipelineStage: true },
      });

      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      let property = await propertyFromDb(ctx.db, lead.propertyId);
      if (!property) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Property not found for this lead",
        });
      }

      // Backfill owner from ATTOM /property/detailowner when missing
      const ownerMissing =
        !property.owner?.name ||
        property.owner.name.trim().toLowerCase() === "unknown owner";
      if (ownerMissing && property.attomId && !ctx.attom.isDemoMode()) {
        try {
          const ownerDetail = await ctx.attom.getOwnerDetail(property.attomId);
          if (
            ownerDetail?.owner?.name &&
            ownerDetail.owner.name.trim().toLowerCase() !== "unknown owner"
          ) {
            await upsertPropertyOwner(
              ctx.db,
              lead.propertyId,
              ownerDetail.owner,
              ownerDetail.ownershipYears,
            );
            property = {
              ...property,
              owner: ownerDetail.owner,
              ownerType: ownerDetail.ownerType ?? property.ownerType,
              ownershipYears:
                ownerDetail.ownershipYears ?? property.ownershipYears,
            };
          }
        } catch {
          // keep DB property without owner
        }
      }

      return {
        property,
        lead: {
          id: lead.id,
          source: lead.source,
          notes: lead.notes,
          createdAt: lead.createdAt,
          pipelineStageName: lead.pipelineStage?.name ?? "Unknown",
          pipelineStageColor: lead.pipelineStage?.color ?? null,
        },
      };
    }),

  status: publicProcedure.query(({ ctx }) => ({
    isDemoMode: ctx.attom.isDemoMode(),
  })),
});
