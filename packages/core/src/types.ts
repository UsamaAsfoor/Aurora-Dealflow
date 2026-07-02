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
}

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
}

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
  filters?: PropertySearchFilters;
  sortBy?: "distance" | "price" | "equity" | "score";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
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
  estimatedValue: number | null;
  estimatedEquity: number | null;
  equityPercent: number | null;
  isAbsentee: boolean;
  isVacant: boolean;
  isPreForeclosure: boolean;
  isTaxDelinquent: boolean;
  score?: number;
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
