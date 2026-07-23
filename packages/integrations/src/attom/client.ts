import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@aurora/db";
import { attomCache } from "@aurora/db";
import type {
  NormalizedProperty,
  PropertyComp,
  PropertySearchParams,
  PropertySearchResult,
} from "@aurora/core";
import { demoProperties, demoSearch } from "./demo-data.js";
import { mapPropertyType } from "./map-property-type.js";
import {
  normalizeAttomProperty,
  normalizeComp,
  normalizeSearchResult,
} from "./normalize.js";

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
   * Build ATTOM query params for multi-property search via /property/snapshot.
   * See: https://api.developer.attomdata.com/docs/guides (Postman / cURL examples)
   */
  private buildSearchParams(
    params: PropertySearchParams,
  ): Record<string, string | number | undefined> {
    const pageSize = Math.min(params.limit ?? 25, 50);
    const page =
      params.offset != null
        ? Math.floor(params.offset / pageSize) + 1
        : 1;

    const attomParams: Record<string, string | number | undefined> = {
      page,
      pagesize: pageSize,
    };

    // Specific address / free-text query
    if (params.query?.trim()) {
      attomParams.address = params.query.trim();
    }

    // Area filters (documented snapshot params)
    // Do not pair cityname with address1/address2 — ATTOM rejects those combinations.
    if (params.zip?.trim()) {
      attomParams.postalCode = params.zip.trim();
    } else if (params.city?.trim()) {
      attomParams.cityname = params.city.trim();
    } else if (params.county?.trim() && params.state?.trim()) {
      // County-by-name is not a first-class snapshot filter; use address search as best effort
      const county = params.county.trim().replace(/\s+county$/i, "");
      attomParams.address = `${county} County, ${params.state.trim().toUpperCase()}`;
    }

    // Radius search (requires lat/lng + radius)
    if (
      params.latitude != null &&
      params.longitude != null &&
      params.radiusMiles != null
    ) {
      attomParams.latitude = params.latitude;
      attomParams.longitude = params.longitude;
      attomParams.radius = params.radiusMiles;
    }

    // Distress / owner filters supported by ATTOM
    if (params.filters?.absenteeOnly) {
      attomParams.absenteeowner = "absentee";
    }

    if (params.filters?.propertyTypes?.length === 1) {
      const type = params.filters.propertyTypes[0];
      if (type === "single_family") attomParams.propertyType = "SFR";
      if (type === "condo") attomParams.propertyType = "CONDOMINIUM";
      if (type === "multi_family") attomParams.propertyIndicator = "21";
      if (type === "land") attomParams.propertyIndicator = "80";
    }

    // Price/equity/vacancy filters are applied client-side after search
    // (minAVMValue is only valid on /attomavm/detail, not /property/snapshot)

    return attomParams;
  }

  async searchProperties(
    params: PropertySearchParams,
  ): Promise<PropertySearchResult[]> {
    if (this.useDemoData) {
      return demoSearch(params);
    }

    const attomParams = this.buildSearchParams(params);

    // Prefer snapshot for list-building; fall back to detail for single-address lookups
    const endpoint = params.query?.trim() && !params.zip && !params.city
      ? "/property/detail"
      : "/property/snapshot";

    let data: AttomListResponse;
    try {
      data = await this.fetchAttom<AttomListResponse>(endpoint, attomParams);
    } catch (error) {
      // Some keys only have snapshot OR detail; try the other once
      const fallback =
        endpoint === "/property/snapshot"
          ? "/property/detail"
          : "/property/snapshot";
      console.warn(
        `ATTOM ${endpoint} failed, retrying ${fallback}:`,
        error instanceof Error ? error.message : error,
      );
      data = await this.fetchAttom<AttomListResponse>(fallback, attomParams);
    }

    return (data.property ?? []).map((item) => normalizeSearchResult(item));
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

  async getComps(attomId: string): Promise<PropertyComp[]> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return property?.comps ?? [];
    }

    const attempts = [
      { endpoint: "/salescomparables", params: { attomId } },
      { endpoint: "/salescomparables/detail", params: { attomId } },
      { endpoint: "/sale/snapshot", params: { attomId, radius: 1 } },
    ] as const;

    for (const attempt of attempts) {
      try {
        const data = await this.fetchAttom<AttomListResponse>(
          attempt.endpoint,
          attempt.params,
        );
        const properties = data.property ?? [];
        if (properties.length > 0) {
          return properties
            .map((item) => normalizeComp(item))
            .filter((comp) => comp.attomId && comp.attomId !== attomId)
            .slice(0, 12);
        }
      } catch {
        // try next
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

  async getFullProperty(attomId: string): Promise<NormalizedProperty> {
    const [detail, avmData, comps, preForeclosure, tax] = await Promise.all([
      this.getPropertyDetail(attomId),
      this.getAVM(attomId),
      this.getComps(attomId),
      this.getPreForeclosure(attomId),
      this.getTaxAssessor(attomId),
    ]);

    const avm = avmData.avm ?? detail.valuation.avm;
    const mortgage = detail.valuation.estimatedMortgageBalance;
    const equity =
      avm != null && mortgage != null ? Math.max(avm - mortgage, 0) : null;
    const equityPercent =
      avm != null && equity != null && avm > 0 ? (equity / avm) * 100 : null;

    return {
      ...detail,
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

export { mapPropertyType };
