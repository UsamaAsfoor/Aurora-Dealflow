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

function parseMailingOneLine(oneLine: string): {
  line1: string;
  city: string;
  state: string;
  zip: string;
} {
  const parts = oneLine
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const line1 = parts[0] ?? oneLine;
    const city = parts[parts.length - 2] ?? "";
    const stateZipPart = parts[parts.length - 1] ?? "";
    const stateZip = stateZipPart.split(/\s+/).filter(Boolean);
    return {
      line1,
      city,
      state: stateZip[0] ?? "",
      zip: stateZip.slice(1).join(" ") || "",
    };
  }
  if (parts.length === 2) {
    const line1 = parts[0] ?? oneLine;
    const stateZipPart = parts[1] ?? "";
    const stateZip = stateZipPart.split(/\s+/).filter(Boolean);
    return {
      line1,
      city: "",
      state: stateZip[0] ?? "",
      zip: stateZip.slice(1).join(" ") || "",
    };
  }
  return { line1: oneLine, city: "", state: "", zip: "" };
}

/** Owner mailing from nested mailingAddress or detailowner mailingaddressoneline. */
function parseOwnerMailingAddress(
  ownerRaw: Record<string, unknown> | undefined,
  fallback: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  },
) {
  const mailing =
    asRecord(ownerRaw?.mailingAddress) ?? asRecord(ownerRaw?.mailingaddress);
  if (mailing) return parseAddress(mailing);

  const oneLine =
    asString(ownerRaw?.mailingaddressoneline) ??
    asString(ownerRaw?.mailingAddressOneLine) ??
    asString(ownerRaw?.mailingAddressOneline);
  if (oneLine) return parseMailingOneLine(oneLine);

  return { ...fallback };
}

/** Owner display name across detail / detailowner / snapshot shapes. */
function extractOwnerName(
  ownerRaw: Record<string, unknown> | undefined,
): string | null {
  if (!ownerRaw) return null;

  if (typeof ownerRaw.owner1 === "string") {
    return asString(ownerRaw.owner1) ?? null;
  }

  const owner1 = asRecord(ownerRaw.owner1);
  const fromParts = [
    asString(owner1?.firstnameandmi) ??
      asString(owner1?.firstNameAndMi) ??
      asString(owner1?.firstname) ??
      asString(owner1?.firstName),
    asString(owner1?.lastname) ?? asString(owner1?.lastName),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    asString(asRecord(owner1?.fullName)?.full) ??
    asString(owner1?.fullnameName) ??
    (fromParts || undefined) ??
    asString(ownerRaw.name) ??
    asString(ownerRaw.ownername) ??
    asString(ownerRaw.ownerName) ??
    null
  );
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
  const mailingLine =
    asString(asRecord(owner?.mailingAddress)?.oneLine) ??
    asString(asRecord(owner?.mailingAddress)?.line1) ??
    asString(owner?.mailingaddressoneline) ??
    asString(owner?.mailingAddressOneLine) ??
    "";
  if (!mailingLine) return false;

  return !mailingLine.toLowerCase().includes(address.line1.toLowerCase());
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
  const market = asRecord(assessment?.market);
  const mortgage = asRecord(item.mortgage);
  const mortgageAmount = asRecord(mortgage?.amount);
  const sale = asRecord(item.sale) ?? asRecord(item.sales);
  const saleAmount = asRecord(sale?.amount);
  const owner = asRecord(item.owner);
  const lot = asRecord(item.lot);

  const estimatedValue =
    asNumber(amount?.value) ??
    asNumber(avm?.eventValue) ??
    asNumber(assessed?.assdTtlValue) ??
    asNumber(assessed?.marketValue) ??
    asNumber(market?.mktTtlValue) ??
    asNumber(saleAmount?.saleamt) ??
    asNumber(sale?.saleamt) ??
    asNumber(summary?.calculatedimprvalue) ??
    asNumber(summary?.calcimprvalue);

  const mortgageBalance =
    asNumber(mortgageAmount?.balance) ??
    asNumber(mortgage?.balance) ??
    asNumber(mortgageAmount?.firstamountdefault);
  const equity =
    estimatedValue != null && mortgageBalance != null
      ? Math.max(estimatedValue - mortgageBalance, 0)
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

  const ownershipYears = asNumber(summary?.yearbuiltownership);

  const yearBuilt =
    asNumber(summary?.yearbuilt) ?? asNumber(building?.yearbuilt);
  const lotAcres = asNumber(lot?.lotSize1) ?? asNumber(lot?.lotsize1);
  const lotSqft =
    asNumber(lot?.lotSize2) ??
    asNumber(lot?.lotsize2) ??
    (lotAcres != null ? Math.round(lotAcres * 43560) : null);

  const ownerName = extractOwnerName(owner);

  const result: PropertySearchResult = {
    attomId: extractAttomId(item),
    address,
    latitude: asNumber(location?.latitude) ?? 0,
    longitude: asNumber(location?.longitude) ?? 0,
    propertyType: propertyTypeFromItem(item),
    beds: asNumber(rooms?.beds) ?? asNumber(summary?.beds),
    baths:
      asNumber(rooms?.bathstotal) ??
      asNumber(rooms?.bathsTotal) ??
      asNumber(summary?.baths),
    sqft:
      asNumber(size?.universalsize) ??
      asNumber(size?.livingsize) ??
      asNumber(size?.bldgsize),
    yearBuilt,
    lotSqft,
    ownershipYears:
      ownershipYears != null && ownershipYears > 0 && ownershipYears < 200
        ? ownershipYears
        : null,
    ownerName: ownerName ?? null,
    estimatedValue,
    estimatedEquity: equity,
    equityPercent,
    isAbsentee,
    isVacant,
    isPreForeclosure:
      Boolean(item.preForeclosure) ||
      Boolean(asRecord(item.preforeclosure)) ||
      asString(summary?.foreclosureStatus)?.toLowerCase().includes("pre") ===
        true,
    isTaxDelinquent,
  };

  result.score = computeSearchResultScore({
    attomId: result.attomId,
    equityPercent: result.equityPercent,
    ownershipYears: result.ownershipYears ?? null,
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
  const salesRaw = (item.sale ?? item.sales ?? []) as unknown[];

  const avmValue = asNumber(amount?.value);
  const mortgageBalance =
    asNumber(mortgageAmount?.balance) ?? asNumber(mortgage?.balance);
  const equity =
    avmValue != null && mortgageBalance != null
      ? Math.max(avmValue - mortgageBalance, 0)
      : null;

  const mailingAddress = parseOwnerMailingAddress(ownerRaw, address);
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
  const owner1Record = asRecord(ownerRaw?.owner1);
  const ownerName = extractOwnerName(ownerRaw) ?? "Unknown Owner";

  const identifier = asRecord(item.identifier);
  const apn =
    asString(identifier?.apn) ??
    asString(identifier?.APN) ??
    asString(identifier?.apnOrig) ??
    null;

  const ownerTypeRaw =
    asString(ownerRaw?.type) ??
    asString(ownerRaw?.ownerType) ??
    asString(ownerRaw?.corporateindicator) ??
    asString(ownerRaw?.corporateIndicator) ??
    asString(owner1Record?.corpIndicator);
  const ownerType =
    ownerTypeRaw?.toLowerCase().includes("corp") ||
    ownerTypeRaw?.toLowerCase().includes("company") ||
    ownerTypeRaw?.toUpperCase() === "Y" ||
    /\b(llc|inc|corp|trust|lp|ltd)\b/i.test(ownerName)
      ? "Company"
      : ownerRaw
        ? "Individual"
        : null;

  const lastSaleType = sales[0]?.saleType;
  const purchaseMethod = lastSaleType
    ? /cash/i.test(lastSaleType)
      ? "Cash"
      : "Financed"
    : mortgageBalance != null && mortgageBalance > 0
      ? "Financed"
      : null;

  const openMortgageCount =
    mortgageBalance != null && mortgageBalance > 0
      ? 1
      : mortgageBalance === 0
        ? 0
        : null;

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
    apn,
    ownerType,
    purchaseMethod,
    openMortgageCount,
    listingStatus: asString(summary?.propstatus) ?? asString(summary?.status),
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
  const lot = asRecord(item.lot);
  const summary = asRecord(item.summary);

  const beds =
    asNumber(rooms?.beds) ??
    asNumber(summary?.beds) ??
    asNumber(item.beds);
  const baths =
    asNumber(rooms?.bathstotal) ??
    asNumber(rooms?.bathsTotal) ??
    asNumber(summary?.baths) ??
    asNumber(item.baths);
  const sqft =
    asNumber(size?.universalsize) ??
    asNumber(size?.livingsize) ??
    asNumber(size?.universalSize) ??
    asNumber(item.sqft);
  const lotSqft =
    asNumber(lot?.lotsize2) ??
    asNumber(lot?.lotSize2) ??
    asNumber(lot?.lotsize1) ??
    asNumber(item?.lotSqft) ??
    asNumber(item.lotSqft);

  const latitude =
    asNumber(location?.latitude) ??
    asNumber(location?.lat) ??
    asNumber(item.latitude);
  const longitude =
    asNumber(location?.longitude) ??
    asNumber(location?.lng) ??
    asNumber(location?.lon) ??
    asNumber(item.longitude);

  const saleDate =
    asString(sale?.saleTransDate) ??
    asString(sale?.salesearchdate) ??
    asString(sale?.saleSearchDate) ??
    null;

  return {
    attomId: extractAttomId(item),
    address,
    saleDate,
    salePrice:
      asNumber(amount?.saleAmt) ??
      asNumber(amount?.saleamt) ??
      asNumber(sale?.saleAmt),
    distanceMiles:
      asNumber(location?.distance) ?? asNumber(location?.distanceMiles),
    beds,
    baths,
    sqft,
    lotSqft,
    latitude,
    longitude,
  };
}
