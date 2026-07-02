import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@aurora/db";
import { attomCache } from "@aurora/db";
import type {
  NormalizedProperty,
  PropertyComp,
  PropertySearchParams,
  PropertySearchResult,
  PropertyType,
} from "@aurora/core";
import { demoProperties, demoSearch } from "./demo-data.js";
import { normalizeAttomProperty, normalizeSearchResult } from "./normalize.js";

const ATTOM_BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface AttomClientOptions {
  apiKey?: string;
  db?: Db;
  useDemoData?: boolean;
}

export class AttomClient {
  private apiKey?: string;
  private db?: Db;
  private useDemoData: boolean;

  constructor(options: AttomClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ATTOM_API_KEY;
    this.db = options.db;
    this.useDemoData =
      options.useDemoData ??
      (!this.apiKey ||
        this.apiKey === "your_attom_api_key" ||
        process.env.ATTOM_USE_DEMO === "true");
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

    const rows = await this.db
      .select()
      .from(attomCache)
      .where(
        and(eq(attomCache.cacheKey, cacheKey), gt(attomCache.expiresAt, new Date())),
      )
      .limit(1);

    if (rows[0]) {
      return rows[0].response as T;
    }

    return null;
  }

  private async setCached(cacheKey: string, response: unknown): Promise<void> {
    if (!this.db) return;

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
  }

  private async fetchAttom<T>(
    endpoint: string,
    params: Record<string, string | number | undefined>,
  ): Promise<T> {
    const cacheKey = this.cacheKey(endpoint, params);
    const cached = await this.getCached<T>(cacheKey);
    if (cached) return cached;

    const url = new URL(`${ATTOM_BASE_URL}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        apikey: this.apiKey!,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`ATTOM API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as T;
    await this.setCached(cacheKey, data);
    return data;
  }

  async searchProperties(
    params: PropertySearchParams,
  ): Promise<PropertySearchResult[]> {
    if (this.useDemoData) {
      return demoSearch(params);
    }

    const attomParams: Record<string, string | number | undefined> = {
      postalcode: params.zip,
      locality: params.city,
      state: params.state,
      county: params.county,
      address: params.query,
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radiusMiles,
      page: params.offset ? Math.floor(params.offset / (params.limit ?? 25)) + 1 : 1,
      pagesize: params.limit ?? 25,
    };

    const data = await this.fetchAttom<{ property?: unknown[] }>(
      "/property/detail",
      attomParams,
    );

    const properties = (data.property ?? []) as unknown[];
    return properties.map((item) => normalizeSearchResult(item));
  }

  async getPropertyDetail(attomId: string): Promise<NormalizedProperty> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      if (!property) {
        throw new Error(`Property not found: ${attomId}`);
      }
      return property;
    }

    const data = await this.fetchAttom<{ property?: unknown[] }>(
      "/property/expandedprofile",
      { attomid: attomId },
    );

    const property = data.property?.[0];
    if (!property) {
      throw new Error(`Property not found: ${attomId}`);
    }

    return normalizeAttomProperty(property);
  }

  async getAVM(attomId: string): Promise<{ avm: number | null }> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return { avm: property?.valuation.avm ?? null };
    }

    const data = await this.fetchAttom<{ property?: Array<{ avm?: { amount?: { value?: number } } }> }>(
      "/avm/detail",
      { attomid: attomId },
    );

    return {
      avm: data.property?.[0]?.avm?.amount?.value ?? null,
    };
  }

  async getComps(attomId: string): Promise<PropertyComp[]> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return property?.comps ?? [];
    }

    const data = await this.fetchAttom<{ property?: unknown[] }>(
      "/salescomparables/detail",
      { attomid: attomId },
    );

    return (data.property ?? []).map((item) => {
      const comp = item as Record<string, unknown>;
      const address = comp.address as Record<string, string> | undefined;
      const sale = comp.sale as Record<string, unknown> | undefined;
      const amount = sale?.amount as Record<string, number> | undefined;
      const identifier = comp.identifier as Record<string, string> | undefined;
      const location = comp.location as Record<string, number> | undefined;
      const building = comp.building as Record<string, unknown> | undefined;
      const rooms = building?.rooms as Record<string, number> | undefined;
      const size = building?.size as Record<string, number> | undefined;

      return {
        attomId: String(identifier?.attomId ?? comp.attomId ?? ""),
        address: {
          line1: address?.oneLine ?? address?.line1 ?? "Unknown",
          city: address?.locality ?? "",
          state: address?.countrySubd ?? "",
          zip: address?.postal1 ?? "",
        },
        saleDate: (sale?.saleTransDate as string) ?? null,
        salePrice: amount?.saleAmt ?? null,
        distanceMiles: location?.distance ?? null,
        beds: rooms?.beds ?? null,
        baths: rooms?.bathstotal ?? null,
        sqft: size?.universalsize ?? null,
      } satisfies PropertyComp;
    });
  }

  async getPreForeclosure(attomId: string): Promise<{ isPreForeclosure: boolean }> {
    if (this.useDemoData) {
      const property = demoProperties.find((p) => p.attomId === attomId);
      return { isPreForeclosure: property?.isPreForeclosure ?? false };
    }

    try {
      const data = await this.fetchAttom<{ property?: unknown[] }>(
        "/preforeclosuredetail",
        { attomid: attomId },
      );
      return { isPreForeclosure: (data.property?.length ?? 0) > 0 };
    } catch {
      return { isPreForeclosure: false };
    }
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

    const data = await this.fetchAttom<{
      property?: Array<{
        assessment?: { tax?: { taxAmt?: number } };
        delinquent?: { delinquentAmt?: number };
      }>;
    }>("/assessment/detail", { attomid: attomId });

    const tax = data.property?.[0];
    const delinquentAmount = tax?.delinquent?.delinquentAmt ?? null;

    return {
      annualAmount: tax?.assessment?.tax?.taxAmt ?? null,
      isDelinquent: delinquentAmount != null && delinquentAmount > 0,
      delinquentAmount,
    };
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

export function mapPropertyType(raw: string | undefined): PropertyType {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("single") || value.includes("sfr")) return "single_family";
  if (value.includes("multi") || value.includes("duplex")) return "multi_family";
  if (value.includes("condo")) return "condo";
  if (value.includes("town")) return "townhouse";
  if (value.includes("land") || value.includes("vacant")) return "land";
  if (value.includes("commercial")) return "commercial";
  return "other";
}
