import type {
  NormalizedProperty,
  PropertyComp,
  PropertySearchResult,
  PropertyType,
} from "@aurora/core";
import { computeSearchResultScore } from "@aurora/core/scoring";
import { mapPropertyType } from "./map-property-type.js";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseAddress(
  raw: unknown,
  area?: Record<string, unknown>,
): {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
} {
  const address = asRecord(raw);
  return {
    line1:
      asString(address?.line1) ??
      asString(address?.oneLine)?.split(",")[0] ??
      "Unknown",
    line2: asString(address?.line2),
    city: asString(address?.locality) ?? "",
    state: asString(address?.countrySubd) ?? asString(address?.state) ?? "",
    zip: asString(address?.postal1) ?? asString(address?.postalCode) ?? "",
    county:
      asString(area?.countrysecsubd) ??
      asString(address?.countrySecSubd) ??
      asString(address?.county),
  };
}

function isAbsenteeFromPayload(item: Record<string, unknown>): boolean {
  const summary = asRecord(item.summary);
  const absenteeInd = asString(summary?.absenteeInd)?.toUpperCase() ?? "";
  if (absenteeInd.includes("ABSENTEE")) return true;
  if (absenteeInd.includes("OWNER OCCUPIED")) return false;

  const owner = asRecord(item.owner);
  const status = asString(owner?.absenteeOwnerStatus)?.toUpperCase();
  if (status === "A") return true;
  if (status === "O") return false;

  const address = parseAddress(item.address, asRecord(item.area));
  const mailing = asRecord(owner?.mailingAddress);
  if (!mailing) return false;

  const mailingLine =
    asString(mailing.oneLine) ?? asString(mailing.line1) ?? "";
  if (!mailingLine) return false;

  return mailingLine.toLowerCase() !== address.line1.toLowerCase();
}

function propertyTypeFromItem(item: Record<string, unknown>): PropertyType {
  const summary = asRecord(item.summary);
  const building = asRecord(item.building);
  return mapPropertyType(
    asString(summary?.proptype) ??
      asString(summary?.propclass) ??
      asString(building?.propertyType) ??
      asString(summary?.propIndicator),
  );
}

function extractAttomId(item: Record<string, unknown>): string {
  const identifier = asRecord(item.identifier);
  return String(
    identifier?.attomId ??
      identifier?.Id ??
      identifier?.obPropId ??
      item.attomId ??
      "",
  );
}

export function normalizeSearchResult(raw: unknown): PropertySearchResult {
  const item = asRecord(raw) ?? {};
  const area = asRecord(item.area);
  const address = parseAddress(item.address, area);
  const location = asRecord(item.location);
  const building = asRecord(item.building);
  const rooms = asRecord(building?.rooms);
  const size = asRecord(building?.size);
  const summary = asRecord(item.summary);
  const avm = asRecord(item.avm);
  const amount = asRecord(avm?.amount);
  const assessment = asRecord(item.assessment);
  const assessed = asRecord(assessment?.assessed);

  const estimatedValue =
    asNumber(amount?.value) ??
    asNumber(assessed?.assdTtlValue) ??
    asNumber(assessed?.marketValue);
  const mortgage = asNumber(asRecord(item.mortgage)?.balance);
  const equity =
    estimatedValue != null && mortgage != null
      ? Math.max(estimatedValue - mortgage, 0)
      : null;
  const equityPercent =
    estimatedValue != null && equity != null && estimatedValue > 0
      ? (equity / estimatedValue) * 100
      : null;

  const isAbsentee = isAbsenteeFromPayload(item);
  const isVacant =
    Boolean(item.vacant) ||
    asString(summary?.propIndicator) === "80" ||
    (asString(summary?.propclass)?.toLowerCase().includes("vacant") ?? false);
  const delinquentAmount = asNumber(asRecord(item.delinquent)?.delinquentAmt);
  const isTaxDelinquent =
    Boolean(item.taxDelinquent) ||
    (delinquentAmount != null && delinquentAmount > 0);

  const result: PropertySearchResult = {
    attomId: extractAttomId(item),
    address,
    latitude: asNumber(location?.latitude) ?? 0,
    longitude: asNumber(location?.longitude) ?? 0,
    propertyType: propertyTypeFromItem(item),
    beds: asNumber(rooms?.beds),
    baths: asNumber(rooms?.bathstotal),
    sqft: asNumber(size?.universalsize) ?? asNumber(size?.livingsize),
    estimatedValue,
    estimatedEquity: equity,
    equityPercent,
    isAbsentee,
    isVacant,
    isPreForeclosure: Boolean(item.preForeclosure),
    isTaxDelinquent,
  };

  result.score = computeSearchResultScore({
    attomId: result.attomId,
    equityPercent: result.equityPercent,
    ownershipYears: null,
    isAbsentee: result.isAbsentee,
    isVacant: result.isVacant,
    isPreForeclosure: result.isPreForeclosure,
    isTaxDelinquent: result.isTaxDelinquent,
  });

  return result;
}

export function normalizeAttomProperty(raw: unknown): NormalizedProperty {
  const item = asRecord(raw) ?? {};
  const area = asRecord(item.area);
  const address = parseAddress(item.address, area);
  const location = asRecord(item.location);
  const building = asRecord(item.building);
  const rooms = asRecord(building?.rooms);
  const size = asRecord(building?.size);
  const summary = asRecord(item.summary);
  const avm = asRecord(item.avm);
  const amount = asRecord(avm?.amount);
  const assessment = asRecord(item.assessment);
  const assessed = asRecord(assessment?.assessed);
  const mortgage = asRecord(item.mortgage);
  const mortgageAmount = asRecord(mortgage?.amount);
  const ownerRaw = asRecord(item.owner);
  const mailing = asRecord(ownerRaw?.mailingAddress);
  const salesRaw = (item.sale ?? item.sales ?? []) as unknown[];

  const avmValue = asNumber(amount?.value);
  const mortgageBalance =
    asNumber(mortgageAmount?.balance) ?? asNumber(mortgage?.balance);
  const equity =
    avmValue != null && mortgageBalance != null
      ? Math.max(avmValue - mortgageBalance, 0)
      : null;

  const mailingAddress = mailing ? parseAddress(mailing) : { ...address };
  const isAbsentee = isAbsenteeFromPayload(item);

  const sales = (Array.isArray(salesRaw) ? salesRaw : [salesRaw])
    .filter(Boolean)
    .map((sale) => {
      const s = asRecord(sale) ?? {};
      const saleAmount = asRecord(s.amount);
      return {
        saleDate: asString(s.saleTransDate) ?? null,
        salePrice: asNumber(saleAmount?.saleAmt),
        saleType: asString(s.saleDocType) ?? null,
      };
    });

  const firstSaleDate = sales[0]?.saleDate
    ? new Date(sales[0].saleDate)
    : null;
  const ownershipYears = firstSaleDate
    ? Math.floor(
        (Date.now() - firstSaleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  const delinquentAmount = asNumber(asRecord(item.delinquent)?.delinquentAmt);
  const owner1 = ownerRaw?.owner1;
  const owner1Record = asRecord(owner1);
  const ownerName =
    asString(asRecord(owner1Record?.fullName)?.full) ??
    asString(owner1) ??
    asString(ownerRaw?.name) ??
    "Unknown Owner";

  return {
    attomId: extractAttomId(item),
    address,
    latitude: asNumber(location?.latitude) ?? 0,
    longitude: asNumber(location?.longitude) ?? 0,
    propertyType: propertyTypeFromItem(item),
    beds: asNumber(rooms?.beds),
    baths: asNumber(rooms?.bathstotal),
    sqft: asNumber(size?.universalsize) ?? asNumber(size?.livingsize),
    lotSqft: asNumber(size?.lotsize2) ?? asNumber(asRecord(item.lot)?.lotsize2),
    yearBuilt:
      asNumber(summary?.yearbuilt) ?? asNumber(asRecord(building?.summary)?.yearbuilt),
    owner: ownerRaw
      ? {
          name: ownerName,
          mailingAddress,
          isAbsentee,
        }
      : null,
    valuation: {
      avm: avmValue,
      assessedValue: asNumber(assessed?.assdTtlValue),
      estimatedMortgageBalance: mortgageBalance,
      estimatedEquity: equity,
      equityPercent:
        avmValue != null && equity != null && avmValue > 0
          ? (equity / avmValue) * 100
          : null,
    },
    tax: {
      annualAmount: asNumber(asRecord(assessment?.tax)?.taxAmt),
      isDelinquent:
        Boolean(item.taxDelinquent) ||
        (delinquentAmount != null && delinquentAmount > 0),
      delinquentAmount,
    },
    sales,
    comps: [],
    isVacant:
      Boolean(item.vacant) ||
      asString(summary?.propIndicator) === "80",
    isPreForeclosure: Boolean(item.preForeclosure),
    ownershipYears,
  };
}

export function normalizedToSearchResult(
  property: NormalizedProperty,
): PropertySearchResult {
  const result: PropertySearchResult = {
    attomId: property.attomId,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    propertyType: property.propertyType,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
    estimatedValue: property.valuation.avm,
    estimatedEquity: property.valuation.estimatedEquity,
    equityPercent: property.valuation.equityPercent,
    isAbsentee: property.owner?.isAbsentee ?? false,
    isVacant: property.isVacant,
    isPreForeclosure: property.isPreForeclosure,
    isTaxDelinquent: property.tax.isDelinquent,
    mlsNumber: property.mlsNumber ?? null,
    listingStatus: property.listingStatus ?? null,
    emlsStatus: property.emlsStatus ?? null,
    daysExpired: property.daysExpired ?? null,
    vacancyMonths: property.vacancyMonths ?? null,
    isExpiredListing: property.isExpiredListing ?? false,
    isEmlsListing: property.isEmlsListing ?? false,
  };

  result.score = computeSearchResultScore({
    attomId: result.attomId,
    equityPercent: result.equityPercent,
    ownershipYears: property.ownershipYears,
    isAbsentee: result.isAbsentee,
    isVacant: result.isVacant,
    isPreForeclosure: result.isPreForeclosure,
    isTaxDelinquent: result.isTaxDelinquent,
  });

  return result;
}

export function normalizeComp(raw: unknown): PropertyComp {
  const item = asRecord(raw) ?? {};
  const address = parseAddress(item.address, asRecord(item.area));
  const sale = asRecord(item.sale);
  const amount = asRecord(sale?.amount);
  const location = asRecord(item.location);
  const building = asRecord(item.building);
  const rooms = asRecord(building?.rooms);
  const size = asRecord(building?.size);

  return {
    attomId: extractAttomId(item),
    address,
    saleDate: asString(sale?.saleTransDate) ?? null,
    salePrice: asNumber(amount?.saleAmt),
    distanceMiles: asNumber(location?.distance),
    beds: asNumber(rooms?.beds),
    baths: asNumber(rooms?.bathstotal),
    sqft: asNumber(size?.universalsize),
  };
}
