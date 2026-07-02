import type {
  NormalizedProperty,
  PropertyComp,
  PropertySearchParams,
  PropertySearchResult,
  PropertyType,
} from "@aurora/core";
import { computeSearchResultScore } from "@aurora/core/scoring";
import { mapPropertyType } from "./client.js";

function parseAddress(raw: unknown): {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
} {
  const address = raw as Record<string, string> | undefined;
  return {
    line1: address?.line1 ?? address?.oneLine?.split(",")[0] ?? "Unknown",
    line2: address?.line2,
    city: address?.locality ?? "",
    state: address?.countrySubd ?? address?.state ?? "",
    zip: address?.postal1 ?? address?.postalCode ?? "",
    county: address?.countrySecSubd,
  };
}

export function normalizeSearchResult(raw: unknown): PropertySearchResult {
  const item = raw as Record<string, unknown>;
  const identifier = item.identifier as Record<string, string> | undefined;
  const address = parseAddress(item.address);
  const location = item.location as Record<string, number> | undefined;
  const building = item.building as Record<string, unknown> | undefined;
  const rooms = building?.rooms as Record<string, number> | undefined;
  const size = building?.size as Record<string, number> | undefined;
  const avm = item.avm as Record<string, unknown> | undefined;
  const amount = avm?.amount as Record<string, number> | undefined;
  const estimatedValue = amount?.value ?? null;
  const mortgage = (item.mortgage as Record<string, number>)?.balance ?? null;
  const equity =
    estimatedValue != null && mortgage != null
      ? Math.max(estimatedValue - mortgage, 0)
      : null;
  const equityPercent =
    estimatedValue != null && equity != null && estimatedValue > 0
      ? (equity / estimatedValue) * 100
      : null;

  const owner = item.owner as Record<string, unknown> | undefined;
  const mailing = owner?.mailingAddress as Record<string, string> | undefined;

  const result: PropertySearchResult = {
    attomId: String(identifier?.attomId ?? identifier?.Id ?? item.attomId ?? ""),
    address,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    propertyType: mapPropertyType(building?.propertyType as string),
    beds: rooms?.beds ?? null,
    baths: rooms?.bathstotal ?? null,
    sqft: size?.universalsize ?? size?.livingsize ?? null,
    estimatedValue,
    estimatedEquity: equity,
    equityPercent,
    isAbsentee:
      Boolean(mailing) &&
      (mailing?.oneLine ?? mailing?.line1)?.toLowerCase() !==
        address.line1.toLowerCase(),
    isVacant: Boolean(item.vacant),
    isPreForeclosure: Boolean(item.preForeclosure),
    isTaxDelinquent: Boolean(item.taxDelinquent),
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
  const item = raw as Record<string, unknown>;
  const identifier = item.identifier as Record<string, string> | undefined;
  const address = parseAddress(item.address);
  const location = item.location as Record<string, number> | undefined;
  const building = item.building as Record<string, unknown> | undefined;
  const rooms = building?.rooms as Record<string, number> | undefined;
  const size = building?.size as Record<string, number> | undefined;
  const summary = building?.summary as Record<string, number> | undefined;
  const avm = item.avm as Record<string, unknown> | undefined;
  const amount = avm?.amount as Record<string, number> | undefined;
  const assessment = item.assessment as Record<string, unknown> | undefined;
  const assessed = assessment?.assessed as Record<string, number> | undefined;
  const mortgage = item.mortgage as Record<string, unknown> | undefined;
  const mortgageAmount = mortgage?.amount as Record<string, number> | undefined;
  const ownerRaw = item.owner as Record<string, unknown> | undefined;
  const mailing = ownerRaw?.mailingAddress as Record<string, string> | undefined;
  const salesRaw = (item.sale ?? item.sales ?? []) as unknown[];
  const avmValue = amount?.value ?? null;
  const mortgageBalance = mortgageAmount?.balance ?? null;
  const equity =
    avmValue != null && mortgageBalance != null
      ? Math.max(avmValue - mortgageBalance, 0)
      : null;

  const mailingAddress = mailing
    ? parseAddress(mailing)
    : { ...address };

  const isAbsentee =
    mailingAddress.line1.toLowerCase() !== address.line1.toLowerCase();

  const sales = (Array.isArray(salesRaw) ? salesRaw : [salesRaw])
    .filter(Boolean)
    .map((sale) => {
      const s = sale as Record<string, unknown>;
      const saleAmount = s.amount as Record<string, number> | undefined;
      return {
        saleDate: (s.saleTransDate as string) ?? null,
        salePrice: saleAmount?.saleAmt ?? null,
        saleType: (s.saleDocType as string) ?? null,
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

  return {
    attomId: String(identifier?.attomId ?? identifier?.Id ?? ""),
    address,
    latitude: location?.latitude ?? 0,
    longitude: location?.longitude ?? 0,
    propertyType: mapPropertyType(building?.propertyType as string) as PropertyType,
    beds: rooms?.beds ?? null,
    baths: rooms?.bathstotal ?? null,
    sqft: size?.universalsize ?? size?.livingsize ?? null,
    lotSqft: size?.lotsize1 ?? null,
    yearBuilt: summary?.yearbuilt ?? null,
    owner: ownerRaw
      ? {
          name: String(ownerRaw.owner1 ?? ownerRaw.name ?? "Unknown Owner"),
          mailingAddress,
          isAbsentee,
        }
      : null,
    valuation: {
      avm: avmValue,
      assessedValue: assessed?.assdTtlValue ?? null,
      estimatedMortgageBalance: mortgageBalance,
      estimatedEquity: equity,
      equityPercent:
        avmValue != null && equity != null && avmValue > 0
          ? (equity / avmValue) * 100
          : null,
    },
    tax: {
      annualAmount:
        ((assessment?.tax as Record<string, number>)?.taxAmt as number) ?? null,
      isDelinquent: Boolean(item.taxDelinquent),
      delinquentAmount: null,
    },
    sales,
    comps: [],
    isVacant: Boolean(item.vacant),
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
  const item = raw as Record<string, unknown>;
  const address = parseAddress(item.address);
  const sale = item.sale as Record<string, unknown> | undefined;
  const amount = sale?.amount as Record<string, number> | undefined;

  return {
    attomId: String(
      (item.identifier as Record<string, string>)?.attomId ?? item.attomId ?? "",
    ),
    address,
    saleDate: (sale?.saleTransDate as string) ?? null,
    salePrice: amount?.saleAmt ?? null,
    distanceMiles: (item.location as Record<string, number>)?.distance ?? null,
    beds: ((item.building as Record<string, unknown>)?.rooms as Record<string, number>)
      ?.beds ?? null,
    baths: ((item.building as Record<string, unknown>)?.rooms as Record<string, number>)
      ?.bathstotal ?? null,
    sqft: ((item.building as Record<string, unknown>)?.size as Record<string, number>)
      ?.universalsize ?? null,
  };
}
