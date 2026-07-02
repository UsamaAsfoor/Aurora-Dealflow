import type {
  NormalizedProperty,
  PropertySearchParams,
  PropertySearchResult,
} from "@aurora/core";
import { normalizedToSearchResult } from "./normalize.js";

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
        saleDate: "2024-08-10",
        salePrice: 275000,
        distanceMiles: 0.1,
        beds: 4,
        baths: 2,
        sqft: 2100,
      },
      {
        attomId: "demo-comp-2",
        address: {
          line1: "820 Maple Street",
          city: "Springfield",
          state: "IL",
          zip: "62704",
        },
        saleDate: "2024-11-22",
        salePrice: 298000,
        distanceMiles: 0.4,
        beds: 4,
        baths: 2.5,
        sqft: 2350,
      },
    ],
    isVacant: false,
    isPreForeclosure: false,
    ownershipYears: 19,
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
        saleDate: "2025-01-05",
        salePrice: 305000,
        distanceMiles: 0.05,
        beds: 3,
        baths: 2,
        sqft: 1750,
      },
    ],
    isVacant: true,
    isPreForeclosure: true,
    ownershipYears: 7,
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
        saleDate: "2024-03-18",
        salePrice: 1180000,
        distanceMiles: 0.08,
        beds: 3,
        baths: 2,
        sqft: 2300,
      },
    ],
    isVacant: true,
    isPreForeclosure: false,
    ownershipYears: 24,
  },
];

function applyFilters(
  results: PropertySearchResult[],
  params: PropertySearchParams,
): PropertySearchResult[] {
  let filtered = [...results];
  const filters = params.filters;

  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.address.line1.toLowerCase().includes(q) ||
        r.address.city.toLowerCase().includes(q) ||
        r.address.zip.includes(q),
    );
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
  const limit = params.limit ?? 25;
  return filtered.slice(offset, offset + limit);
}

export function demoSearch(params: PropertySearchParams): PropertySearchResult[] {
  const results = demoProperties.map(normalizedToSearchResult);
  return applyFilters(results, params);
}
