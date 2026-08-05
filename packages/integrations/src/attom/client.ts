import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@aurora/db";
import { attomCache } from "@aurora/db";
import type {
  CompsQueryOptions,
  NormalizedProperty,
  PropertyComp,
  PropertySearchPage,
  PropertySearchParams,
  PropertySearchResult,
  SoldWithinMonths,
} from "@aurora/core";
import {
  ATTOM_MAX_PAGE_SIZE,
  ATTOM_MAX_SEARCH_TOTAL,
  DEFAULT_SEARCH_LIMIT,
  MAX_SEARCH_FETCH,
  formatAttomDate,
  soldWindowCutoffIso,
  splitStreetAddress,
} from "@aurora/core";
import { computeSearchResultScore } from "@aurora/core/scoring";
import { demoProperties, demoSearch, filterDemoComps } from "./demo-data.js";
import { mapPropertyType } from "./map-property-type.js";
import {
  normalizeAttomProperty,
  normalizeComp,
  normalizeSearchResult,
} from "./normalize.js";

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clampRadiusMiles(value?: number): number {
  if (value == null || !Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function normalizeSoldMonths(value?: SoldWithinMonths): SoldWithinMonths {
  if (value === 3 || value === 6 || value === 12) return value;
  return 6;
}

function filterCompsLocally(
  comps: PropertyComp[],
  options: {
    subjectAttomId: string;
    radiusMiles: number;
    soldWithinMonths: SoldWithinMonths;
    subjectLat?: number | null;
    subjectLng?: number | null;
  },
): PropertyComp[] {
  const cutoff = soldWindowCutoffIso(options.soldWithinMonths);
  const cutoffTime = new Date(cutoff).getTime();

  return comps
    .filter((comp) => comp.attomId && comp.attomId !== options.subjectAttomId)
    .map((comp) => {
      let distanceMiles = comp.distanceMiles;
      if (
        distanceMiles == null &&
        options.subjectLat != null &&
        options.subjectLng != null &&
        comp.latitude != null &&
        comp.longitude != null
      ) {
        distanceMiles =
          Math.round(
            haversineMiles(
              options.subjectLat,
              options.subjectLng,
              comp.latitude,
              comp.longitude,
            ) * 100,
          ) / 100;
      }
      return { ...comp, distanceMiles };
    })
    .filter((comp) => {
      if (
        comp.distanceMiles != null &&
        comp.distanceMiles > options.radiusMiles
      ) {
        return false;
      }
      if (comp.saleDate) {
        const saleTime = new Date(comp.saleDate).getTime();
        if (Number.isFinite(saleTime) && saleTime < cutoffTime) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const da = a.distanceMiles ?? Number.POSITIVE_INFINITY;
      const db = b.distanceMiles ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      const ta = a.saleDate ? new Date(a.saleDate).getTime() : 0;
      const tb = b.saleDate ? new Date(b.saleDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 25);
}

/**
 * ATTOM Property API v1
 * Docs: https://api.developer.attomdata.com/docs
 * Guides: https://api.developer.attomdata.com/docs/guides
 *
 * Base: https://api.gateway.attomdata.com/propertyapi/v1.0.0/{resource}/{package}
 * Auth header: apikey: <ATTOM_API_KEY>
 */
const ATTOM_BASE_URL =
  process.env.ATTOM_BASE_URL ??
  "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface AttomClientOptions {
  apiKey?: string;
  db?: Db;
  useDemoData?: boolean;
}

interface AttomStatus {
  version?: string;
  code?: number;
  msg?: string;
  total?: number;
  page?: number;
  pagesize?: number;
}

interface AttomListResponse {
  status?: AttomStatus;
  property?: unknown[];
}

function isPlaceholderKey(apiKey?: string): boolean {
  if (!apiKey) return true;
  const normalized = apiKey.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized === "your_attom_api_key" ||
    normalized.includes("your_") ||
    normalized.includes("replace")
  );
}

function applyAttomTlsInsecure(): void {
  // Local/dev only: corporate TLS inspection breaks Node's cert chain.
  if (process.env.ATTOM_TLS_INSECURE === "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

export class AttomClient {
  private apiKey?: string;
  private db?: Db;
  private useDemoData: boolean;

  constructor(options: AttomClientOptions = {}) {
    applyAttomTlsInsecure();
    this.apiKey = options.apiKey ?? process.env.ATTOM_API_KEY;
    this.db = options.db;

    const forceDemo = process.env.ATTOM_USE_DEMO === "true";
    const forceLive = process.env.ATTOM_USE_DEMO === "false";

    if (options.useDemoData != null) {
      this.useDemoData = options.useDemoData;
    } else if (forceLive && !isPlaceholderKey(this.apiKey)) {
      this.useDemoData = false;
    } else if (forceDemo || isPlaceholderKey(this.apiKey)) {
      this.useDemoData = true;
    } else {
      this.useDemoData = false;
    }
  }

  isDemoMode(): boolean {
    return this.useDemoData;
  }

  private cacheKey(endpoint: string, params: Record<string, unknown>): string {
    return createHash("sha256")
      .update(`${endpoint}:${JSON.stringify(params)}`)
      .digest("hex");
  }

  private async getCached<T>(cacheKey: string): Promise<T | null> {
    if (!this.db) return null;

    try {
      const rows = await this.db
        .select()
        .from(attomCache)
        .where(
          and(
            eq(attomCache.cacheKey, cacheKey),
            gt(attomCache.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (rows[0]) {
        return rows[0].response as T;
      }
    } catch (error) {
      console.warn(
        "ATTOM cache read failed; continuing without cache:",
        error instanceof Error ? error.message : error,
      );
    }

    return null;
  }

  private async setCached(cacheKey: string, response: unknown): Promise<void> {
    if (!this.db) return;

    try {
      await this.db
        .insert(attomCache)
        .values({
          cacheKey,
          response,
          expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        })
        .onConflictDoUpdate({
          target: attomCache.cacheKey,
          set: {
            response,
            expiresAt: new Date(Date.now() + CACHE_TTL_MS),
          },
        });
    } catch (error) {
      console.warn(
        "ATTOM cache write failed; continuing without cache:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async fetchAttom<T>(
    endpoint: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    if (!this.apiKey || isPlaceholderKey(this.apiKey)) {
      throw new Error(
        "ATTOM_API_KEY is missing. Set a real key and ATTOM_USE_DEMO=false.",
      );
    }

    const cacheKey = this.cacheKey(endpoint, params);
    const cached = await this.getCached<T>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${ATTOM_BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          apikey: this.apiKey,
        },
      });
    } catch (error) {
      const cause =
        error instanceof Error && "cause" in error
          ? (error as Error & { cause?: { code?: string; message?: string } })
              .cause
          : undefined;
      const causeCode = cause?.code ?? "";
      if (
        causeCode.includes("CERT") ||
        causeCode.includes("UNABLE_TO_VERIFY") ||
        String(error).includes("certificate")
      ) {
        throw new Error(
          "ATTOM TLS failed (self-signed/intercepted cert). For local dev set ATTOM_TLS_INSECURE=true in apps/api/.env, then restart the API.",
        );
      }
      throw error;
    }

    const bodyText = await response.text();
    let data: T & { status?: AttomStatus };
    try {
      data = JSON.parse(bodyText) as T & { status?: AttomStatus };
    } catch {
      throw new Error(`ATTOM API error ${response.status}: ${bodyText}`);
    }

    const statusMsg = (data.status?.msg ?? "").toLowerCase();
    // Treat "no matches" / incomplete location as empty list, not a hard failure
    if (
      statusMsg.includes("withoutresult") ||
      statusMsg.includes("missing or incomplete") ||
      statusMsg.includes("invalid parameter")
    ) {
      const empty = { ...data, property: [] } as T;
      return empty;
    }

    if (!response.ok) {
      throw new Error(`ATTOM API error ${response.status}: ${bodyText}`);
    }

    if (
      statusMsg &&
      !statusMsg.includes("success") &&
      data.status?.code !== 0
    ) {
      console.warn(`ATTOM ${endpoint}: ${data.status?.msg}`);
    }

    await this.setCached(cacheKey, data);
    return data;
  }

  /**
   * Derive center + radius from polygon / bounds when lat/lng not provided.
   * ATTOM v1 list endpoints take radius search, not arbitrary polygons.
   */
  private resolveGeo(params: PropertySearchParams): {
    latitude?: number;
    longitude?: number;
    radiusMiles?: number;
  } {
    if (
      params.latitude != null &&
      params.longitude != null &&
      params.radiusMiles != null
    ) {
      return {
        latitude: params.latitude,
        longitude: params.longitude,
        radiusMiles: params.radiusMiles,
      };
    }

    if (params.polygon && params.polygon.length >= 3) {
      const lats = params.polygon.map((p) => p.lat);
      const lngs = params.polygon.map((p) => p.lng);
      const latitude = (Math.min(...lats) + Math.max(...lats)) / 2;
      const longitude = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      let radiusMiles = 0.5;
      for (const point of params.polygon) {
        radiusMiles = Math.max(
          radiusMiles,
          haversineMiles(latitude, longitude, point.lat, point.lng),
        );
      }
      return {
        latitude,
        longitude,
        radiusMiles: Math.min(50, Math.ceil(radiusMiles * 10) / 10),
      };
    }

    if (params.bounds) {
      const { north, south, east, west } = params.bounds;
      const latitude = (north + south) / 2;
      const longitude = (east + west) / 2;
      const radiusMiles = haversineMiles(latitude, longitude, north, east);
      return {
        latitude,
        longitude,
        radiusMiles: Math.min(50, Math.ceil(radiusMiles * 10) / 10),
      };
    }

    return {};
  }

  /**
   * Build ATTOM query params for multi-property search.
   * Docs: https://cloud-help.attomdata.com/article/687-api-search-parameters
   * pagesize max = 100; universe max = 10,000.
   */
  private buildSearchParams(
    params: PropertySearchParams,
    page: number,
    pageSize: number,
    options?: { includeAvmValueFilters?: boolean },
  ): Record<string, string | number | undefined> {
    const attomParams: Record<string, string | number | undefined> = {
      page,
      pagesize: pageSize,
    };

    // Specific address / free-text query
    if (params.query?.trim()) {
      attomParams.address = params.query.trim();
    }

    // Area filters — do not pair cityname with address1/address2
    if (params.zip?.trim()) {
      // ATTOM accepts both casings across package versions
      attomParams.postalcode = params.zip.trim();
      attomParams.postalCode = params.zip.trim();
    } else if (params.city?.trim()) {
      attomParams.cityname = params.city.trim();
      if (params.state?.trim()) {
        attomParams.state = params.state.trim().toUpperCase();
      }
    } else if (params.county?.trim() && params.state?.trim()) {
      const county = params.county.trim().replace(/\s+county$/i, "");
      attomParams.address = `${county} County, ${params.state.trim().toUpperCase()}`;
    }

    const geo = this.resolveGeo(params);
    if (
      geo.latitude != null &&
      geo.longitude != null &&
      geo.radiusMiles != null
    ) {
      attomParams.latitude = geo.latitude;
      attomParams.longitude = geo.longitude;
      attomParams.radius = geo.radiusMiles;
    }

    if (params.filters?.absenteeOnly) {
      attomParams.absenteeowner = "absentee";
    }

    if (params.filters?.propertyTypes?.length === 1) {
      const type = params.filters.propertyTypes[0];
      if (type === "single_family") {
        attomParams.propertytype = "SFR";
        attomParams.propertyType = "SFR";
      }
      if (type === "condo") {
        attomParams.propertytype = "CONDOMINIUM";
        attomParams.propertyType = "CONDOMINIUM";
      }
      if (type === "multi_family") attomParams.propertyindicator = "21";
      if (type === "land") attomParams.propertyindicator = "80";
      if (type === "townhouse") attomParams.propertytype = "TOWNHOUSE / ROW HOUSE";
    }

    // Value filters — supported on AVM / assessment packages
    if (options?.includeAvmValueFilters) {
      if (params.filters?.minPrice != null) {
        attomParams.minavmvalue = Math.round(params.filters.minPrice);
      }
      if (params.filters?.maxPrice != null) {
        attomParams.maxavmvalue = Math.round(params.filters.maxPrice);
      }
    }

    if (params.sortBy === "price") {
      attomParams.orderby =
        params.sortOrder === "asc" ? "avmvalue+asc" : "avmvalue+desc";
    } else if (
      geo.latitude != null &&
      (params.sortBy === "distance" || params.radiusMiles != null)
    ) {
      attomParams.orderby =
        params.sortOrder === "desc" ? "distance+desc" : "distance+asc";
    }

    return attomParams;
  }

  private async fetchSearchPage(
    endpoint: string,
    params: PropertySearchParams,
    page: number,
    pageSize: number,
    options?: { includeAvmValueFilters?: boolean },
  ): Promise<AttomListResponse> {
    const attomParams = this.buildSearchParams(
      params,
      page,
      pageSize,
      options,
    );
    return this.fetchAttom<AttomListResponse>(endpoint, attomParams);
  }

  /**
   * Page through ATTOM until we fill `limit` or exhaust `status.total`.
   * Page 1 is sequential (needed for total); remaining pages fetch in parallel.
   */
  private async fetchPagedProperties(
    endpoint: string,
    params: PropertySearchParams,
    options?: { includeAvmValueFilters?: boolean },
  ): Promise<{ properties: unknown[]; total: number; pageSize: number }> {
    const pageSize = ATTOM_MAX_PAGE_SIZE;
    const offset = Math.max(0, params.offset ?? 0);
    const limit = Math.min(
      Math.max(1, params.limit ?? DEFAULT_SEARCH_LIMIT),
      MAX_SEARCH_FETCH,
      ATTOM_MAX_SEARCH_TOTAL,
    );
    const startPage = Math.floor(offset / pageSize) + 1;
    const pagesNeeded = Math.ceil((offset % pageSize + limit) / pageSize);

    const first = await this.fetchSearchPage(
      endpoint,
      params,
      startPage,
      pageSize,
      options,
    );
    const total = Math.min(
      first.status?.total ?? first.property?.length ?? 0,
      ATTOM_MAX_SEARCH_TOTAL,
    );
    const collected: unknown[] = [...(first.property ?? [])];

    const extraPages: number[] = [];
    for (let i = 1; i < pagesNeeded; i++) {
      const page = startPage + i;
      if ((page - 1) * pageSize >= total) break;
      extraPages.push(page);
    }

    if (extraPages.length > 0) {
      const rest = await Promise.all(
        extraPages.map((page) =>
          this.fetchSearchPage(endpoint, params, page, pageSize, options).catch(
            (error) => {
              console.warn(
                `ATTOM ${endpoint} page ${page} failed:`,
                error instanceof Error ? error.message : error,
              );
              return { property: [] } as AttomListResponse;
            },
          ),
        ),
      );
      for (const pageData of rest) {
        collected.push(...(pageData.property ?? []));
      }
    }

    const sliceStart = offset % pageSize;
    const properties = collected.slice(sliceStart, sliceStart + limit);
    return { properties, total, pageSize };
  }

  /** Merge richer value/owner fields from another ATTOM package by attomId. */
  private mergeSearchEnrichment(
    base: PropertySearchResult[],
    enrichment: PropertySearchResult[],
  ): PropertySearchResult[] {
    if (enrichment.length === 0) return base;
    const byId = new Map(enrichment.map((r) => [r.attomId, r]));
    return base.map((row) => {
      const extra = byId.get(row.attomId);
      if (!extra) return row;
      const estimatedValue = row.estimatedValue ?? extra.estimatedValue;
      const estimatedEquity = row.estimatedEquity ?? extra.estimatedEquity;
      const equityPercent = row.equityPercent ?? extra.equityPercent;
      return {
        ...row,
        estimatedValue,
        estimatedEquity,
        equityPercent,
        yearBuilt: row.yearBuilt ?? extra.yearBuilt,
        lotSqft: row.lotSqft ?? extra.lotSqft,
        ownershipYears: row.ownershipYears ?? extra.ownershipYears,
        ownerName: row.ownerName ?? extra.ownerName,
        beds: row.beds ?? extra.beds,
        baths: row.baths ?? extra.baths,
        sqft: row.sqft ?? extra.sqft,
        isAbsentee: row.isAbsentee || extra.isAbsentee,
        isVacant: row.isVacant || extra.isVacant,
        isPreForeclosure: row.isPreForeclosure || extra.isPreForeclosure,
        isTaxDelinquent: row.isTaxDelinquent || extra.isTaxDelinquent,
        score: computeSearchResultScore({
          attomId: row.attomId,
          equityPercent,
          ownershipYears: row.ownershipYears ?? extra.ownershipYears ?? null,
          isAbsentee: row.isAbsentee || extra.isAbsentee,
          isVacant: row.isVacant || extra.isVacant,
          isPreForeclosure: row.isPreForeclosure || extra.isPreForeclosure,
          isTaxDelinquent: row.isTaxDelinquent || extra.isTaxDelinquent,
        }),
      };
    });
  }

  private async searchByAddress(query: string): Promise<PropertySearchPage> {
    const split = splitStreetAddress(query);
    const attempts: Array<{
      endpoint: string;
      params: Record<string, string | number | undefined>;
    }> = [
      {
        endpoint: "/property/address",
        params: { address: split.address, page: 1, pagesize: 5 },
      },
      {
        endpoint: "/property/expandedprofile",
        params: { address: split.address, page: 1, pagesize: 5 },
      },
      {
        endpoint: "/property/detail",
        params: { address: split.address, page: 1, pagesize: 5 },
      },
    ];

    if (split.address1 && split.address2) {
      attempts.unshift({
        endpoint: "/property/address",
        params: {
          address1: split.address1,
          address2: split.address2,
          page: 1,
          pagesize: 5,
        },
      });
      attempts.push({
        endpoint: "/property/detail",
        params: {
          address1: split.address1,
          address2: split.address2,
          page: 1,
          pagesize: 5,
        },
      });
    }

    for (const attempt of attempts) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(
          attempt.endpoint,
          attempt.params,
        );
        const results = (data.property ?? []).map((item) =>
          normalizeSearchResult(item),
        );
        if (results.length > 0) {
          const best = results.slice(0, 1);
          return {
            results: best,
            total: data.status?.total ?? best.length,
            fetched: best.length,
            pageSize: 5,
            hasMore: false,
          };
        }
      } catch (error) {
        console.warn(
          `ATTOM address lookup ${attempt.endpoint} failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return {
      results: [],
      total: 0,
      fetched: 0,
      pageSize: 5,
      hasMore: false,
    };
  }

  async searchProperties(
    params: PropertySearchParams,
  ): Promise<PropertySearchPage> {
    if (this.useDemoData) {
      return demoSearch(params);
    }

    const isAddressLookup =
      params.lookupMode === "address" ||
      Boolean(
        params.query?.trim() && !params.zip && !params.city && !params.county,
      );

    if (isAddressLookup && params.query?.trim()) {
      return this.searchByAddress(params.query.trim());
    }

    const wantsValueFilters =
      params.filters?.minPrice != null || params.filters?.maxPrice != null;

    // Prefer inventory snapshot; fall back to detail. When price filters are set,
    // also pull AVM package (supports minavmvalue/maxavmvalue) and merge.
    const primaryEndpoints = wantsValueFilters
      ? ["/attomavm/detail", "/property/snapshot", "/assessment/snapshot"]
      : ["/property/snapshot", "/assessment/snapshot", "/property/detail"];

    let properties: unknown[] = [];
    let total = 0;
    let pageSize = ATTOM_MAX_PAGE_SIZE;
    let usedEndpoint = primaryEndpoints[0]!;

    for (const endpoint of primaryEndpoints) {
      try {
        const page = await this.fetchPagedProperties(endpoint, params, {
          includeAvmValueFilters:
            endpoint.includes("avm") || endpoint.includes("assessment"),
        });
        if (page.properties.length > 0 || page.total > 0) {
          properties = page.properties;
          total = page.total;
          pageSize = page.pageSize;
          usedEndpoint = endpoint;
          break;
        }
      } catch (error) {
        console.warn(
          `ATTOM ${endpoint} search failed:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    let results = properties.map((item) => normalizeSearchResult(item));

    // Enrich with AVM / assessment when primary package lacked values
    const missingValues = results.filter((r) => r.estimatedValue == null).length;
    if (
      results.length > 0 &&
      missingValues > results.length * 0.4 &&
      !usedEndpoint.includes("avm")
    ) {
      try {
        const enrich = await this.fetchPagedProperties(
          "/attomavm/detail",
          { ...params, limit: Math.min(results.length, MAX_SEARCH_FETCH) },
          { includeAvmValueFilters: wantsValueFilters },
        );
        const enrichResults = enrich.properties.map((item) =>
          normalizeSearchResult(item),
        );
        results = this.mergeSearchEnrichment(results, enrichResults);
        total = Math.max(total, enrich.total);
      } catch (error) {
        console.warn(
          "ATTOM AVM enrichment failed:",
          error instanceof Error ? error.message : error,
        );
      }
    }

    // Dedupe by attomId (can happen across overlapping pages / packages)
    const seen = new Set<string>();
    results = results.filter((row) => {
      if (!row.attomId || seen.has(row.attomId)) return false;
      seen.add(row.attomId);
      return true;
    });

    const offset = params.offset ?? 0;
    const limit = Math.min(
      params.limit ?? DEFAULT_SEARCH_LIMIT,
      MAX_SEARCH_FETCH,
    );

    return {
      results,
      total,
      fetched: results.length,
      pageSize,
      hasMore: offset + results.length < total && results.length >= limit,
    };
  }

  async getPropertyDetail(attomId: string): Promise<NormalizedProperty> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      if (!property) {
        throw new Error(`Property not found: ${attomId}`);
      }
      return property;
    }

    // expandedprofile is richest; fall back to detail then basicprofile
    const attempts: Array<{
      endpoint: string;
      params: Record<string, string | number | undefined>;
    }> = [
      { endpoint: "/property/expandedprofile", params: { attomId } },
      { endpoint: "/property/detail", params: { attomId } },
      { endpoint: "/property/detail", params: { ID: attomId } },
      { endpoint: "/property/basicprofile", params: { attomId } },
    ];

    let lastError: unknown;
    for (const attempt of attempts) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(
          attempt.endpoint,
          attempt.params,
        );
        const property = data.property?.[0];
        if (property) {
          return normalizeAttomProperty(property);
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Property not found: ${attomId}${
        lastError instanceof Error ? ` (${lastError.message})` : ""
      }`,
    );
  }

  async getAVM(attomId: string): Promise<{ avm: number | null }> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return { avm: property?.valuation.avm ?? null };
    }

    const endpoints = ["/attomavm/detail", "/avm/detail"] as const;
    for (const endpoint of endpoints) {
      try {
        const data = await this.fetchAttom<{
          property?: Array<{ avm?: { amount?: { value?: number } } }>;
        }>(endpoint, { attomId });
        const value = data.property?.[0]?.avm?.amount?.value;
        if (value != null) {
          return { avm: value };
        }
      } catch {
        // try next endpoint
      }
    }

    return { avm: null };
  }

  async getComps(
    attomId: string,
    options: CompsQueryOptions = {},
  ): Promise<PropertyComp[]> {
    const radiusMiles = clampRadiusMiles(options.radiusMiles);
    const soldWithinMonths = normalizeSoldMonths(options.soldWithinMonths);
    const startSaleTransDate = formatAttomDate(
      soldWindowCutoffIso(soldWithinMonths),
    );
    const endSaleTransDate = formatAttomDate(
      new Date().toISOString().slice(0, 10),
    );

    if (this.useDemoData) {
      return filterDemoComps(attomId, { radiusMiles, soldWithinMonths });
    }

    let subjectLat: number | null = null;
    let subjectLng: number | null = null;
    try {
      const detail = await this.getPropertyDetail(attomId);
      subjectLat = detail.latitude || null;
      subjectLng = detail.longitude || null;
    } catch {
      // proceed without subject coordinates
    }

    const attempts: Array<{
      endpoint: string;
      params: Record<string, string | number>;
    }> = [
      {
        endpoint: "/salescomparables",
        params: { attomId, radius: radiusMiles },
      },
      {
        endpoint: "/salescomparables/detail",
        params: { attomId, radius: radiusMiles },
      },
      {
        endpoint: "/sale/snapshot",
        params: {
          attomId,
          radius: radiusMiles,
          startSaleTransDate,
          endSaleTransDate,
        },
      },
    ];

    if (subjectLat != null && subjectLng != null) {
      attempts.push({
        endpoint: "/sale/snapshot",
        params: {
          latitude: subjectLat,
          longitude: subjectLng,
          radius: radiusMiles,
          startSaleTransDate,
          endSaleTransDate,
        },
      });
    }

    for (const attempt of attempts) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(
          attempt.endpoint,
          attempt.params,
        );
        const properties = data.property ?? [];
        if (properties.length > 0) {
          const comps = properties.map((item) => normalizeComp(item));
          return filterCompsLocally(comps, {
            subjectAttomId: attomId,
            radiusMiles,
            soldWithinMonths,
            subjectLat,
            subjectLng,
          });
        }
      } catch {
        // try next endpoint / param shape
      }
    }

    return [];
  }

  async getPreForeclosure(
    attomId: string,
  ): Promise<{ isPreForeclosure: boolean }> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return { isPreForeclosure: property?.isPreForeclosure ?? false };
    }

    // Pre-foreclosure is a separate ATTOM product; soft-fail when not subscribed
    const endpoints = [
      "/preforeclosure/detail",
      "/preforeclosuredetail",
    ] as const;

    for (const endpoint of endpoints) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(endpoint, {
          attomId,
        });
        if ((data.property?.length ?? 0) > 0) {
          return { isPreForeclosure: true };
        }
      } catch {
        // not entitled or wrong path
      }
    }

    return { isPreForeclosure: false };
  }

  async getTaxAssessor(attomId: string): Promise<{
    annualAmount: number | null;
    isDelinquent: boolean;
    delinquentAmount: number | null;
  }> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return {
        annualAmount: property?.tax.annualAmount ?? null,
        isDelinquent: property?.tax.isDelinquent ?? false,
        delinquentAmount: property?.tax.delinquentAmount ?? null,
      };
    }

    try {
      const data = await this.fetchAttom<{
        property?: Array<{
          assessment?: { tax?: { taxAmt?: number } };
          delinquent?: { delinquentAmt?: number };
        }>;
      }>("/assessment/detail", { attomId });

      const tax = data.property?.[0];
      const delinquentAmount = tax?.delinquent?.delinquentAmt ?? null;

      return {
        annualAmount: tax?.assessment?.tax?.taxAmt ?? null,
        isDelinquent: delinquentAmount != null && delinquentAmount > 0,
        delinquentAmount,
      };
    } catch {
      return {
        annualAmount: null,
        isDelinquent: false,
        delinquentAmount: null,
      };
    }
  }

  /**
   * ATTOM /property/detailowner — owner identity + mailing address.
   * Soft-fails when the package isn't entitled or returns no owner.
   */
  async getOwnerDetail(attomId: string): Promise<NormalizedProperty | null> {
    if (this.useDemoData) {
      return demoProperties.find((p) => p.attomId === attomId) ?? null;
    }

    const attempts: Array<{
      endpoint: string;
      params: Record<string, string | number | undefined>;
    }> = [
      { endpoint: "/property/detailowner", params: { attomId } },
      { endpoint: "/property/detailowner", params: { ID: attomId } },
    ];

    for (const attempt of attempts) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(
          attempt.endpoint,
          attempt.params,
        );
        const property = data.property?.[0];
        if (property) {
          return normalizeAttomProperty(property);
        }
      } catch {
        // try next param shape / soft-fail
      }
    }

    return null;
  }

  async getFullProperty(attomId: string): Promise<NormalizedProperty> {
    const [detail, avmData, comps, preForeclosure, tax, ownerDetail] =
      await Promise.all([
        this.getPropertyDetail(attomId),
        this.getAVM(attomId),
        this.getComps(attomId),
        this.getPreForeclosure(attomId),
        this.getTaxAssessor(attomId),
        this.getOwnerDetail(attomId),
      ]);

    const avm = avmData.avm ?? detail.valuation.avm;
    const mortgage = detail.valuation.estimatedMortgageBalance;
    const equity =
      avm != null && mortgage != null ? Math.max(avm - mortgage, 0) : null;
    const equityPercent =
      avm != null && equity != null && avm > 0 ? (equity / avm) * 100 : null;

    // Prefer /property/detailowner for name + mailing when available
    const owner =
      (hasUsefulOwner(ownerDetail?.owner) ? ownerDetail!.owner : null) ??
      (hasUsefulOwner(detail.owner) ? detail.owner : null) ??
      ownerDetail?.owner ??
      detail.owner ??
      null;

    return {
      ...detail,
      owner,
      ownerType: ownerDetail?.ownerType ?? detail.ownerType ?? null,
      ownershipYears:
        ownerDetail?.ownershipYears ?? detail.ownershipYears ?? null,
      valuation: {
        ...detail.valuation,
        avm,
        estimatedEquity: equity,
        equityPercent,
      },
      tax: {
        annualAmount: tax.annualAmount ?? detail.tax.annualAmount,
        isDelinquent: tax.isDelinquent || detail.tax.isDelinquent,
        delinquentAmount: tax.delinquentAmount ?? detail.tax.delinquentAmount,
      },
      comps: comps.length > 0 ? comps : detail.comps,
      isPreForeclosure:
        preForeclosure.isPreForeclosure || detail.isPreForeclosure,
    };
  }
}

function hasUsefulOwner(
  owner: NormalizedProperty["owner"] | null | undefined,
): boolean {
  if (!owner?.name) return false;
  const name = owner.name.trim().toLowerCase();
  return name.length > 0 && name !== "unknown owner";
}

export { mapPropertyType };
