export type DealStrategy =
  | "list"
  | "cash_offer"
  | "wholesale"
  | "hold"
  | "flip"
  | "buyer_match"
  | "follow_up_later";

export type PropertyType =
  | "single_family"
  | "multi_family"
  | "condo"
  | "townhouse"
  | "land"
  | "commercial"
  | "other";

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
}

export interface PropertyOwner {
  name: string;
  mailingAddress: Address;
  isAbsentee: boolean;
}

export interface PropertyValuation {
  avm: number | null;
  assessedValue: number | null;
  estimatedMortgageBalance: number | null;
  estimatedEquity: number | null;
  equityPercent: number | null;
}

export interface PropertyTax {
  annualAmount: number | null;
  isDelinquent: boolean;
  delinquentAmount: number | null;
}

export interface PropertySale {
  saleDate: string | null;
  salePrice: number | null;
  saleType: string | null;
}

export interface PropertyComp {
  attomId: string;
  address: Address;
  saleDate: string | null;
  salePrice: number | null;
  distanceMiles: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type SoldWithinMonths = 3 | 6 | 12;

export interface CompsQueryOptions {
  radiusMiles?: number;
  soldWithinMonths?: SoldWithinMonths;
}

export interface CompsAnalysis {
  comps: PropertyComp[];
  averageSalePrice: number | null;
  averagePricePerSqft: number | null;
  estimatedArv: number | null;
  radiusMiles: number;
  soldWithinMonths: SoldWithinMonths;
}

export interface PropertySignals {
  attomId: string;
  equityPercent: number | null;
  ownershipYears: number | null;
  isAbsentee: boolean;
  isVacant: boolean;
  isPreForeclosure: boolean;
  isTaxDelinquent: boolean;
  recentSaleDiscountPercent: number | null;
}

export interface NormalizedProperty {
  attomId: string;
  address: Address;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSqft: number | null;
  yearBuilt: number | null;
  owner: PropertyOwner | null;
  valuation: PropertyValuation;
  tax: PropertyTax;
  sales: PropertySale[];
  comps: PropertyComp[];
  isVacant: boolean;
  isPreForeclosure: boolean;
  ownershipYears: number | null;
  apn?: string | null;
  ownerType?: string | null;
  purchaseMethod?: string | null;
  openMortgageCount?: number | null;
  mlsNumber?: string | null;
  listingStatus?: string | null;
  emlsStatus?: string | null;
  daysExpired?: number | null;
  vacancyMonths?: number | null;
  isExpiredListing?: boolean;
  isEmlsListing?: boolean;
}

export type SearchMode =
  | "list_building"
  | "vacant"
  | "absentee"
  | "pre_foreclosure"
  | "tax_delinquent"
  | "expired_listings"
  | "mls_lookup"
  | "emls"
  | "specific_property"
  | "radius_search";

export interface PropertySearchFilters {
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minEquityPercent?: number;
  maxEquityPercent?: number;
  minOwnershipYears?: number;
  absenteeOnly?: boolean;
  vacantOnly?: boolean;
  preForeclosureOnly?: boolean;
  taxDelinquentOnly?: boolean;
  recentlySoldDays?: number;
  minScore?: number;
  searchMode?: SearchMode;
  mlsNumber?: string;
  listingStatus?: string;
  emlsStatus?: string;
  minDaysExpired?: number;
  minVacancyMonths?: number;
  outOfStateOnly?: boolean;
  minDelinquentAmount?: number;
  minDelinquentYears?: number;
}

export type PropertyLookupMode = "area" | "address";

export interface PropertySearchParams {
  query?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
  polygon?: Array<{ lat: number; lng: number }>;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** area = multi-property ZIP/city/county; address = single-property lookup */
  lookupMode?: PropertyLookupMode;
  filters?: PropertySearchFilters;
  sortBy?: "distance" | "price" | "equity" | "score";
  sortOrder?: "asc" | "desc";
  /** How many results to return (ATTOM pagesize max 100; we page to fill this). */
  limit?: number;
  offset?: number;
}

/** ATTOM max pagesize is 100; max properties per search universe is 10_000. */
export const ATTOM_MAX_PAGE_SIZE = 100;
export const ATTOM_MAX_SEARCH_TOTAL = 10_000;
/** Default inventory pull per search (multiple ATTOM pages). */
export const DEFAULT_SEARCH_LIMIT = 250;
/** Hard cap per request to control ATTOM cost. */
export const MAX_SEARCH_FETCH = 1000;

export interface PropertySearchPage {
  results: PropertySearchResult[];
  /** Total matches in ATTOM for this query (across all pages). */
  total: number;
  /** Results returned in this response after local filters. */
  fetched: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PropertySearchResult {
  attomId: string;
  address: Address;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt?: number | null;
  lotSqft?: number | null;
  ownershipYears?: number | null;
  ownerName?: string | null;
  estimatedValue: number | null;
  estimatedEquity: number | null;
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
}

export interface SignalScore {
  signal: keyof PropertySignals | "recentSaleDiscountPercent";
  label: string;
  weight: number;
  rawValue: number | boolean | null;
  normalizedScore: number;
  contribution: number;
}

export interface OpportunityScoreResult {
  score: number;
  breakdown: SignalScore[];
}

export interface AiAnalysisResult {
  score: number;
  breakdown: SignalScore[];
  summary: string;
  strategy: DealStrategy;
  reasoning: string;
}

export const PIPELINE_STAGE_NAMES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Appointment Set",
  "Offer Made",
  "Under Contract",
  "Dispo",
  "Closed",
  "Dead",
  "Follow Up Later",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGE_NAMES)[number];

export function propertySignalsFromNormalized(
  property: NormalizedProperty,
): PropertySignals {
  const lastSale = property.sales[0];
  let recentSaleDiscountPercent: number | null = null;

  if (
    lastSale?.salePrice &&
    property.valuation.avm &&
    property.valuation.avm > 0
  ) {
    recentSaleDiscountPercent =
      ((property.valuation.avm - lastSale.salePrice) / property.valuation.avm) *
      100;
  }

  return {
    attomId: property.attomId,
    equityPercent: property.valuation.equityPercent,
    ownershipYears: property.ownershipYears,
    isAbsentee: property.owner?.isAbsentee ?? false,
    isVacant: property.isVacant,
    isPreForeclosure: property.isPreForeclosure,
    isTaxDelinquent: property.tax.isDelinquent,
    recentSaleDiscountPercent,
  };
}

export function formatAddress(address: Address): string {
  const line2 = address.line2 ? ` ${address.line2}` : "";
  return `${address.line1}${line2}, ${address.city}, ${address.state} ${address.zip}`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function scoreBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function strategyLabel(strategy: DealStrategy): string {
  const labels: Record<DealStrategy, string> = {
    list: "List on MLS",
    cash_offer: "Cash Offer",
    wholesale: "Wholesale",
    hold: "Buy & Hold",
    flip: "Fix & Flip",
    buyer_match: "Match to Buyer",
    follow_up_later: "Follow Up Later",
  };
  return labels[strategy];
}

export function propertyTypeLabel(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    single_family: "Single Family Residential",
    multi_family: "Multi Family",
    condo: "Condominium",
    townhouse: "Townhouse",
    land: "Land",
    commercial: "Commercial",
    other: "Other",
  };
  return labels[type];
}

export function equityRating(equityPercent: number | null | undefined): string {
  if (equityPercent == null) return "—";
  if (equityPercent >= 60) return "High";
  if (equityPercent >= 35) return "Medium";
  return "Low";
}

/** Rough monthly rent estimate when rent comps are unavailable. */
export function estimateMonthlyRent(
  avm: number | null | undefined,
  sqft: number | null | undefined,
): number | null {
  if (avm != null && avm > 0) return Math.round(avm * 0.007);
  if (sqft != null && sqft > 0) return Math.round(sqft * 1.15);
  return null;
}
