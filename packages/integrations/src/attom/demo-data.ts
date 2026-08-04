import type {
  CompsQueryOptions,
  NormalizedProperty,
  PropertyComp,
  PropertySearchParams,
  PropertySearchResult,
  SoldWithinMonths,
} from "@aurora/core";
import { soldWindowCutoffIso } from "@aurora/core";
import { normalizedToSearchResult } from "./normalize.js";

function offsetFromSubject(
  subjectLat: number,
  subjectLng: number,
  distanceMiles: number,
  bearingDeg: number,
): { latitude: number; longitude: number } {
  const earthRadiusMiles = 3958.8;
  const bearing = (bearingDeg * Math.PI) / 180;
  const lat1 = (subjectLat * Math.PI) / 180;
  const lng1 = (subjectLng * Math.PI) / 180;
  const angular = distanceMiles / earthRadiusMiles;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) +
      Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lng2 * 180) / Math.PI,
  };
}

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export const demoProperties: NormalizedProperty[] = [
  {
    attomId: "demo-1001",
    address: {
      line1: "742 Evergreen Terrace",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      county: "Sangamon",
    },
    latitude: 39.7817,
    longitude: -89.6501,
    propertyType: "single_family",
    beds: 4,
    baths: 2,
    sqft: 2200,
    lotSqft: 8000,
    yearBuilt: 1985,
    owner: {
      name: "Homer Simpson",
      mailingAddress: {
        line1: "123 Oak Lane",
        city: "Chicago",
        state: "IL",
        zip: "60601",
      },
      isAbsentee: true,
    },
    valuation: {
      avm: 285000,
      assessedValue: 210000,
      estimatedMortgageBalance: 45000,
      estimatedEquity: 240000,
      equityPercent: 84.2,
    },
    tax: {
      annualAmount: 4200,
      isDelinquent: true,
      delinquentAmount: 8400,
    },
    sales: [
      {
        saleDate: "2006-03-15",
        salePrice: 125000,
        saleType: "Warranty Deed",
      },
    ],
    comps: [
      {
        attomId: "demo-comp-1",
        address: {
          line1: "750 Evergreen Terrace",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: monthsAgoIso(2),
        salePrice: 275000,
        distanceMiles: 0.1,
        beds: 4,
        baths: 2,
        sqft: 2100,
        lotSqft: 7800,
      },
      {
        attomId: "demo-comp-2",
        address: {
          line1: "820 Maple Street",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: monthsAgoIso(4),
        salePrice: 298000,
        distanceMiles: 0.4,
        beds: 4,
        baths: 2.5,
        sqft: 2350,
        lotSqft: 8200,
      },
      {
        attomId: "demo-comp-1b",
        address: {
          line1: "901 Birch Avenue",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: monthsAgoIso(5),
        salePrice: 289000,
        distanceMiles: 1.2,
        beds: 3,
        baths: 2,
        sqft: 2050,
        lotSqft: 7500,
      },
      {
        attomId: "demo-comp-1c",
        address: {
          line1: "1102 Willow Road",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: monthsAgoIso(8),
        salePrice: 268000,
        distanceMiles: 2.4,
        beds: 4,
        baths: 2,
        sqft: 2180,
        lotSqft: 9000,
      },
      {
        attomId: "demo-comp-1d",
        address: {
          line1: "440 Pine Court",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: monthsAgoIso(11),
        salePrice: 312000,
        distanceMiles: 3.8,
        beds: 5,
        baths: 3,
        sqft: 2600,
        lotSqft: 11000,
      },
    ],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 19,
    apn: "14-22-301-015",
    ownerType: "Individual",
    purchaseMethod: "Financed",
    openMortgageCount: 1,
  },
  {
    attomId: "demo-1002",
    address: {
      line1: "1600 Pennsylvania Ave",
      city: "Washington",
      state: "DC",
      zip: "20500",
    },
    latitude: 38.8977,
    longitude: -77.0365,
    propertyType: "multi_family",
    beds: 8,
    baths: 6,
    sqft: 55000,
    lotSqft: 18000,
    yearBuilt: 1800,
    owner: {
      name: "Federal Holdings LLC",
      mailingAddress: {
        line1: "1600 Pennsylvania Ave",
        city: "Washington",
        state: "DC",
        zip: "20500",
      },
      isAbsentee: false,
    },
    valuation: {
      avm: 420000000,
      assessedValue: 380000000,
      estimatedMortgageBalance: 0,
      estimatedEquity: 420000000,
      equityPercent: 100,
    },
    tax: {
      annualAmount: 2500000,
      isDelinquent: false,
      delinquentAmount: null,
    },
    sales: [],
    comps: [],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 50,
  },
  {
    attomId: "demo-1003",
    address: {
      line1: "308 Negra Arroyo Lane",
      city: "Albuquerque",
      state: "NM",
      zip: "87104",
    },
    latitude: 35.0844,
    longitude: -106.6504,
    propertyType: "single_family",
    beds: 3,
    baths: 2,
    sqft: 1800,
    lotSqft: 6000,
    yearBuilt: 1973,
    owner: {
      name: "Walter White",
      mailingAddress: {
        line1: "9800 Margo St",
        city: "Los Angeles",
        state: "CA",
        zip: "90035",
      },
      isAbsentee: true,
    },
    valuation: {
      avm: 320000,
      assessedValue: 195000,
      estimatedMortgageBalance: 85000,
      estimatedEquity: 235000,
      equityPercent: 73.4,
    },
    tax: {
      annualAmount: 3100,
      isDelinquent: false,
      delinquentAmount: null,
    },
    sales: [
      {
        saleDate: "2018-06-01",
        salePrice: 180000,
        saleType: "Warranty Deed",
      },
    ],
    comps: [
      {
        attomId: "demo-comp-3",
        address: {
          line1: "312 Negra Arroyo Lane",
          city: "Albuquerque",
          state: "NM",
          zip: "87104",
        },
        saleDate: monthsAgoIso(1),
        salePrice: 305000,
        distanceMiles: 0.05,
        beds: 3,
        baths: 2,
        sqft: 1750,
        lotSqft: 5800,
      },
      {
        attomId: "demo-comp-3b",
        address: {
          line1: "401 Corrales Drive",
          city: "Albuquerque",
          state: "NM",
          zip: "87104",
        },
        saleDate: monthsAgoIso(4),
        salePrice: 318000,
        distanceMiles: 0.9,
        beds: 3,
        baths: 2,
        sqft: 1900,
        lotSqft: 6200,
      },
      {
        attomId: "demo-comp-3c",
        address: {
          line1: "88 Rio Grande Blvd",
          city: "Albuquerque",
          state: "NM",
          zip: "87104",
        },
        saleDate: monthsAgoIso(9),
        salePrice: 295000,
        distanceMiles: 2.1,
        beds: 3,
        baths: 1.5,
        sqft: 1680,
        lotSqft: 5400,
      },
    ],
    isVacant: true,
    isPreForeclosure: true,
    ownershipYears: 7,
    vacancyMonths: 9,
  },
  {
    attomId: "demo-1004",
    address: {
      line1: "124 Conch Street",
      city: "Bikini Bottom",
      state: "HI",
      zip: "96795",
    },
    latitude: 21.4389,
    longitude: -158.0001,
    propertyType: "single_family",
    beds: 1,
    baths: 1,
    sqft: 600,
    lotSqft: 1200,
    yearBuilt: 1999,
    owner: {
      name: "SpongeBob SquarePants",
      mailingAddress: {
        line1: "124 Conch Street",
        city: "Bikini Bottom",
        state: "HI",
        zip: "96795",
      },
      isAbsentee: false,
    },
    valuation: {
      avm: 450000,
      assessedValue: 380000,
      estimatedMortgageBalance: 320000,
      estimatedEquity: 130000,
      equityPercent: 28.9,
    },
    tax: {
      annualAmount: 5200,
      isDelinquent: false,
      delinquentAmount: null,
    },
    sales: [
      {
        saleDate: "2023-02-14",
        salePrice: 410000,
        saleType: "Warranty Deed",
      },
    ],
    comps: [],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 2,
  },
  {
    attomId: "demo-1005",
    address: {
      line1: "221B Baker Street",
      city: "London",
      state: "NY",
      zip: "10001",
    },
    latitude: 40.7484,
    longitude: -73.9857,
    propertyType: "townhouse",
    beds: 3,
    baths: 2.5,
    sqft: 2400,
    lotSqft: 3000,
    yearBuilt: 1890,
    owner: {
      name: "Sherlock Holmes Trust",
      mailingAddress: {
        line1: "PO Box 221",
        city: "London",
        state: "UK",
        zip: "NW1",
      },
      isAbsentee: true,
    },
    valuation: {
      avm: 1250000,
      assessedValue: 980000,
      estimatedMortgageBalance: 200000,
      estimatedEquity: 1050000,
      equityPercent: 84,
    },
    tax: {
      annualAmount: 18500,
      isDelinquent: true,
      delinquentAmount: 37000,
    },
    sales: [
      {
        saleDate: "2001-09-11",
        salePrice: 450000,
        saleType: "Trust Transfer",
      },
    ],
    comps: [
      {
        attomId: "demo-comp-5",
        address: {
          line1: "219 Baker Street",
          city: "London",
          state: "NY",
          zip: "10001",
        },
        saleDate: monthsAgoIso(3),
        salePrice: 1180000,
        distanceMiles: 0.08,
        beds: 3,
        baths: 2,
        sqft: 2300,
        lotSqft: 2800,
      },
      {
        attomId: "demo-comp-5b",
        address: {
          line1: "225 Baker Street",
          city: "London",
          state: "NY",
          zip: "10001",
        },
        saleDate: monthsAgoIso(7),
        salePrice: 1225000,
        distanceMiles: 0.15,
        beds: 3,
        baths: 2.5,
        sqft: 2450,
        lotSqft: 3100,
      },
    ],
    isVacant: true,
    isPreForeclosure: false,
    ownershipYears: 24,
  },
  {
    attomId: "demo-1006",
    address: {
      line1: "901 Maple Avenue",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      county: "Sangamon",
    },
    latitude: 39.785,
    longitude: -89.648,
    propertyType: "single_family",
    beds: 3,
    baths: 2,
    sqft: 1850,
    lotSqft: 7200,
    yearBuilt: 1978,
    owner: {
      name: "Maple Holdings LLC",
      mailingAddress: {
        line1: "901 Maple Avenue",
        city: "Springfield",
        state: "IL",
        zip: "62704",
      },
      isAbsentee: false,
    },
    valuation: {
      avm: 245000,
      assessedValue: 198000,
      estimatedMortgageBalance: 120000,
      estimatedEquity: 125000,
      equityPercent: 51,
    },
    tax: { annualAmount: 3600, isDelinquent: false, delinquentAmount: null },
    sales: [],
    comps: [],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 6,
    mlsNumber: "MLS456789",
    listingStatus: "active",
    isExpiredListing: false,
    isEmlsListing: false,
  },
  {
    attomId: "demo-1007",
    address: {
      line1: "1440 Oak Street",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      county: "Sangamon",
    },
    latitude: 39.779,
    longitude: -89.655,
    propertyType: "single_family",
    beds: 4,
    baths: 2,
    sqft: 2100,
    lotSqft: 9000,
    yearBuilt: 1965,
    owner: {
      name: "Patricia Lane",
      mailingAddress: {
        line1: "88 Sunset Blvd",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
      },
      isAbsentee: true,
    },
    valuation: {
      avm: 198000,
      assessedValue: 165000,
      estimatedMortgageBalance: 40000,
      estimatedEquity: 158000,
      equityPercent: 79.8,
    },
    tax: { annualAmount: 2900, isDelinquent: false, delinquentAmount: null },
    sales: [],
    comps: [],
    isVacant: true,
    isPreForeclosure: false,
    ownershipYears: 14,
    vacancyMonths: 18,
    mlsNumber: "EMLS789012",
    emlsStatus: "expired",
    isEmlsListing: true,
    isExpiredListing: false,
  },
  {
    attomId: "demo-1008",
    address: {
      line1: "310 Elm Court",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      county: "Sangamon",
    },
    latitude: 39.783,
    longitude: -89.652,
    propertyType: "single_family",
    beds: 3,
    baths: 1.5,
    sqft: 1600,
    lotSqft: 6500,
    yearBuilt: 1952,
    owner: {
      name: "Robert Chen",
      mailingAddress: {
        line1: "310 Elm Court",
        city: "Springfield",
        state: "IL",
        zip: "62704",
      },
      isAbsentee: false,
    },
    valuation: {
      avm: 172000,
      assessedValue: 140000,
      estimatedMortgageBalance: 95000,
      estimatedEquity: 77000,
      equityPercent: 44.8,
    },
    tax: { annualAmount: 2500, isDelinquent: false, delinquentAmount: null },
    sales: [],
    comps: [],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 8,
    mlsNumber: "MLS998877",
    listingStatus: "expired",
    daysExpired: 45,
    isExpiredListing: true,
    isEmlsListing: false,
  },
];

export function filterDemoComps(
  attomId: string,
  options: CompsQueryOptions = {},
): PropertyComp[] {
  const property = demoProperties.find((p) => p.attomId === attomId);
  if (!property) return [];

  const radiusMiles = Math.min(5, Math.max(1, options.radiusMiles ?? 1));
  const soldWithinMonths = (
    options.soldWithinMonths === 3 ||
    options.soldWithinMonths === 6 ||
    options.soldWithinMonths === 12
      ? options.soldWithinMonths
      : 6
  ) as SoldWithinMonths;
  const cutoff = new Date(soldWindowCutoffIso(soldWithinMonths)).getTime();

  return property.comps
    .map((comp, index) => {
      const coords = offsetFromSubject(
        property.latitude,
        property.longitude,
        comp.distanceMiles ?? 0.2 + index * 0.3,
        35 + index * 55,
      );
      return {
        ...comp,
        latitude: comp.latitude ?? coords.latitude,
        longitude: comp.longitude ?? coords.longitude,
        lotSqft: comp.lotSqft ?? property.lotSqft,
      };
    })
    .filter((comp) => (comp.distanceMiles ?? 0) <= radiusMiles)
    .filter((comp) => {
      if (!comp.saleDate) return true;
      const saleTime = new Date(comp.saleDate).getTime();
      return !Number.isFinite(saleTime) || saleTime >= cutoff;
    })
    .sort(
      (a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0),
    );
}

function applyFilters(
  results: PropertySearchResult[],
  params: PropertySearchParams,
): PropertySearchResult[] {
  let filtered = [...results];
  const filters = params.filters;

  if (params.query) {
    const q = params.query.toLowerCase().trim();
    const isAddressLookup =
      params.lookupMode === "address" ||
      (!params.zip && !params.city && !params.county);

    if (isAddressLookup) {
      const scored = filtered
        .map((r) => {
          const line1 = r.address.line1.toLowerCase();
          const full = `${line1}, ${r.address.city.toLowerCase()}, ${r.address.state.toLowerCase()} ${r.address.zip}`.trim();
          let score = 0;
          if (full === q || line1 === q) score = 100;
          else if (full.startsWith(q) || line1.startsWith(q)) score = 80;
          else if (full.includes(q) || line1.includes(q)) score = 50;
          else if (q.includes(line1) && line1.length >= 5) score = 40;
          return { r, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);
      filtered = scored.slice(0, 1).map((item) => item.r);
    } else {
      filtered = filtered.filter(
        (r) =>
          r.address.line1.toLowerCase().includes(q) ||
          r.address.city.toLowerCase().includes(q) ||
          r.address.zip.includes(q),
      );
    }
  }

  if (params.city) {
    filtered = filtered.filter(
      (r) => r.address.city.toLowerCase() === params.city!.toLowerCase(),
    );
  }

  if (params.state) {
    filtered = filtered.filter(
      (r) => r.address.state.toLowerCase() === params.state!.toLowerCase(),
    );
  }

  if (params.zip) {
    filtered = filtered.filter((r) => r.address.zip.startsWith(params.zip!));
  }

  if (params.county) {
    const county = params.county.toLowerCase();
    filtered = filtered.filter((r) =>
      r.address.county?.toLowerCase().includes(county),
    );
  }

  if (filters?.propertyTypes?.length) {
    filtered = filtered.filter((r) =>
      filters.propertyTypes!.includes(r.propertyType),
    );
  }

  if (filters?.minPrice != null) {
    filtered = filtered.filter(
      (r) => (r.estimatedValue ?? 0) >= filters.minPrice!,
    );
  }

  if (filters?.maxPrice != null) {
    filtered = filtered.filter(
      (r) => (r.estimatedValue ?? Infinity) <= filters.maxPrice!,
    );
  }

  if (filters?.minEquityPercent != null) {
    filtered = filtered.filter(
      (r) => (r.equityPercent ?? 0) >= filters.minEquityPercent!,
    );
  }

  if (filters?.absenteeOnly) {
    filtered = filtered.filter((r) => r.isAbsentee);
  }

  if (filters?.vacantOnly) {
    filtered = filtered.filter((r) => r.isVacant);
  }

  if (filters?.preForeclosureOnly) {
    filtered = filtered.filter((r) => r.isPreForeclosure);
  }

  if (filters?.taxDelinquentOnly) {
    filtered = filtered.filter((r) => r.isTaxDelinquent);
  }

  if (filters?.minScore != null) {
    filtered = filtered.filter((r) => (r.score ?? 0) >= filters.minScore!);
  }

  if (filters?.mlsNumber) {
    const mls = filters.mlsNumber.toLowerCase();
    filtered = filtered.filter((r) =>
      r.mlsNumber?.toLowerCase().includes(mls),
    );
  }

  if (filters?.listingStatus) {
    filtered = filtered.filter(
      (r) => r.listingStatus === filters.listingStatus,
    );
  }

  if (filters?.emlsStatus) {
    filtered = filtered.filter((r) => r.emlsStatus === filters.emlsStatus);
  }

  if (filters?.minDaysExpired != null) {
    filtered = filtered.filter(
      (r) => (r.daysExpired ?? 0) >= filters.minDaysExpired!,
    );
  }

  if (filters?.minVacancyMonths != null) {
    filtered = filtered.filter(
      (r) => (r.vacancyMonths ?? 0) >= filters.minVacancyMonths!,
    );
  }

  if (filters?.searchMode === "expired_listings") {
    filtered = filtered.filter((r) => r.isExpiredListing);
  }

  if (filters?.searchMode === "emls") {
    filtered = filtered.filter((r) => r.isEmlsListing);
  }

  if (params.sortBy === "score") {
    filtered.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else if (params.sortBy === "price") {
    filtered.sort(
      (a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0),
    );
  } else if (params.sortBy === "equity") {
    filtered.sort((a, b) => (b.equityPercent ?? 0) - (a.equityPercent ?? 0));
  }

  const offset = params.offset ?? 0;
  const limit = params.limit ?? 250;
  return filtered.slice(offset, offset + limit);
}

export function demoSearch(params: PropertySearchParams): import("@aurora/core").PropertySearchPage {
  const mapped = demoProperties.map(normalizedToSearchResult);
  // Apply filters without slicing to know the true filtered total
  const unpaged = applyFilters(mapped, { ...params, limit: 10_000, offset: 0 });
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 250;
  const results = unpaged.slice(offset, offset + limit);
  return {
    results,
    total: unpaged.length,
    fetched: results.length,
    pageSize: 100,
    hasMore: offset + results.length < unpaged.length,
  };
}
