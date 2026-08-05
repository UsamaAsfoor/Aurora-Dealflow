import {
  looksLikeStreetAddress,
  type PropertySearchFilters,
  type PropertySearchParams,
  type SearchMode,
} from "@aurora/core";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CircleDot,
  Clock,
  FileSearch,
  Home,
  ListFilter,
  MapPinned,
  Radio,
  Scale,
  UserX,
} from "lucide-react";

export type AreaMode = "county" | "zip" | "city";

export type IntentFieldType = "text" | "number" | "select";

export interface IntentFieldDefinition {
  key: string;
  label: string;
  type: IntentFieldType;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  stub?: boolean;
}

export interface DistressIntentDefinition {
  key: SearchMode;
  label: string;
  description: string;
  icon: LucideIcon;
  stub?: boolean;
  fields: IntentFieldDefinition[];
}

export interface SearchWorkspaceState {
  areaMode: AreaMode;
  county: string;
  zip: string;
  city: string;
  state: string;
  intent: SearchMode;
  intentFields: Record<string, string>;
  minPrice: string;
  maxPrice: string;
  minEquityPercent: string;
  minScore: string;
  sortBy: "score" | "price" | "equity" | "distance";
  polygon: Array<{ lat: number; lng: number }> | null;
}

export const defaultSearchState: SearchWorkspaceState = {
  areaMode: "zip",
  county: "",
  zip: "",
  city: "",
  state: "",
  intent: "list_building",
  intentFields: {},
  minPrice: "",
  maxPrice: "",
  minEquityPercent: "",
  minScore: "",
  sortBy: "score",
  polygon: null,
};

export const DISTRESS_INTENTS: DistressIntentDefinition[] = [
  {
    key: "list_building",
    label: "Build a List",
    description: "All properties in your selected area",
    icon: ListFilter,
    fields: [],
  },
  {
    key: "vacant",
    label: "Vacant",
    description: "Vacancy signals — advanced fields limited by ATTOM package",
    icon: Home,
    stub: true,
    fields: [
      {
        key: "minVacancyMonths",
        label: "Min vacancy (months)",
        type: "number",
        placeholder: "6",
        stub: true,
      },
      {
        key: "occupancyStatus",
        label: "Occupancy status",
        type: "select",
        options: [
          { value: "", label: "Any" },
          { value: "vacant", label: "Vacant" },
          { value: "unknown", label: "Unknown occupancy" },
        ],
        stub: true,
      },
      {
        key: "utilitiesStatus",
        label: "Utilities",
        type: "select",
        options: [
          { value: "", label: "Any" },
          { value: "off", label: "Utilities off" },
          { value: "on", label: "Utilities on" },
        ],
        stub: true,
      },
    ],
  },
  {
    key: "absentee",
    label: "Absentee Owner",
    description: "Out-of-area owners with equity",
    icon: UserX,
    fields: [
      {
        key: "outOfStateOnly",
        label: "Out-of-state only",
        type: "select",
        options: [
          { value: "", label: "Any absentee" },
          { value: "yes", label: "Out-of-state only" },
        ],
      },
      {
        key: "minOwnershipYears",
        label: "Min years owned",
        type: "number",
        placeholder: "10",
      },
    ],
  },
  {
    key: "pre_foreclosure",
    label: "Pre-Foreclosure",
    description: "Stub mode — auction/NOD requires upgraded ATTOM package",
    icon: Scale,
    stub: true,
    fields: [
      {
        key: "foreclosureStage",
        label: "Stage",
        type: "select",
        options: [
          { value: "", label: "Any stage" },
          { value: "nod", label: "Notice of default" },
          { value: "auction", label: "Auction scheduled" },
        ],
        stub: true,
      },
      {
        key: "auctionWithinDays",
        label: "Auction within (days)",
        type: "number",
        placeholder: "90",
        stub: true,
      },
    ],
  },
  {
    key: "tax_delinquent",
    label: "Tax Delinquent",
    description: "Stub mode — tax delinquency not in current ATTOM key",
    icon: Building2,
    stub: true,
    fields: [
      {
        key: "minDelinquentAmount",
        label: "Min delinquent ($)",
        type: "number",
        placeholder: "5000",
        stub: true,
      },
      {
        key: "minDelinquentYears",
        label: "Min years delinquent",
        type: "number",
        placeholder: "1",
        stub: true,
      },
    ],
  },
  {
    key: "expired_listings",
    label: "Expired Listings",
    description: "Partial — MLS expiration depth depends on data contract",
    icon: Clock,
    stub: true,
    fields: [
      {
        key: "minDaysExpired",
        label: "Min days expired",
        type: "number",
        placeholder: "30",
      },
      {
        key: "expirationDate",
        label: "Expired after date",
        type: "text",
        placeholder: "YYYY-MM-DD",
        stub: true,
      },
      {
        key: "listingAgent",
        label: "Listing agent",
        type: "text",
        placeholder: "Agent name",
        stub: true,
      },
    ],
  },
  {
    key: "mls_lookup",
    label: "MLS",
    description: "Lookup by MLS number or listing status",
    icon: FileSearch,
    fields: [
      {
        key: "address",
        label: "Address",
        type: "text",
        placeholder: "742 Evergreen Terrace",
      },
      {
        key: "mlsNumber",
        label: "MLS number",
        type: "text",
        placeholder: "MLS123456",
      },
      {
        key: "listingStatus",
        label: "Listing status",
        type: "select",
        options: [
          { value: "", label: "Any status" },
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "expired", label: "Expired" },
        ],
      },
    ],
  },
  {
    key: "emls",
    label: "EMLS",
    description: "Extended MLS search (demo placeholder)",
    icon: Radio,
    stub: true,
    fields: [
      {
        key: "address",
        label: "Address",
        type: "text",
        placeholder: "742 Evergreen Terrace",
      },
      {
        key: "mlsNumber",
        label: "MLS number",
        type: "text",
        placeholder: "EMLS789012",
      },
      {
        key: "emlsStatus",
        label: "EMLS status",
        type: "select",
        options: [
          { value: "", label: "Any status" },
          { value: "active", label: "Active" },
          { value: "withdrawn", label: "Withdrawn" },
          { value: "expired", label: "Expired" },
        ],
        stub: true,
      },
    ],
  },
  {
    key: "specific_property",
    label: "Specific Property",
    description: "Find one property by street address",
    icon: CircleDot,
    fields: [
      {
        key: "address",
        label: "Street address",
        type: "text",
        placeholder: "742 Evergreen Terrace",
        required: true,
      },
    ],
  },
  {
    key: "radius_search",
    label: "Radius Search",
    description: "Properties near an address or map pin",
    icon: MapPinned,
    fields: [
      {
        key: "address",
        label: "Center address",
        type: "text",
        placeholder: "742 Evergreen Terrace",
      },
      {
        key: "radiusMiles",
        label: "Radius (miles)",
        type: "number",
        placeholder: "2",
      },
    ],
  },
];

export function getIntentDefinition(intent: SearchMode): DistressIntentDefinition {
  return (
    DISTRESS_INTENTS.find((item) => item.key === intent) ??
    DISTRESS_INTENTS[0]!
  );
}

const ADDRESS_INTENTS: SearchMode[] = [
  "mls_lookup",
  "emls",
  "specific_property",
  "radius_search",
];

export function intentUsesAddress(intent: SearchMode): boolean {
  return ADDRESS_INTENTS.includes(intent);
}

export function isSearchReady(state: SearchWorkspaceState): boolean {
  // Polygon-only is not yet wired to ATTOM geo search — require a real area.
  const hasArea =
    (state.areaMode === "zip" && state.zip.trim().length >= 5) ||
    (state.areaMode === "county" &&
      state.county.trim().length > 0 &&
      state.state.trim().length === 2) ||
    (state.areaMode === "city" &&
      state.city.trim().length > 0 &&
      state.state.trim().length === 2);

  if (state.intent === "specific_property") {
    return Boolean(state.intentFields.address?.trim());
  }

  if (state.intent === "radius_search") {
    return Boolean(state.intentFields.address?.trim() || hasArea);
  }

  if (state.intent === "mls_lookup" || state.intent === "emls") {
    return Boolean(
      state.intentFields.address?.trim() ||
        state.intentFields.mlsNumber?.trim() ||
        hasArea,
    );
  }

  return hasArea;
}

function num(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() && !Number.isNaN(parsed) ? parsed : undefined;
}

export function buildSearchParams(
  state: SearchWorkspaceState,
): PropertySearchParams | null {
  if (!isSearchReady(state)) return null;

  const filters: PropertySearchFilters = {
    searchMode: state.intent,
  };

  if (state.minPrice) filters.minPrice = num(state.minPrice);
  if (state.maxPrice) filters.maxPrice = num(state.maxPrice);
  if (state.minEquityPercent) {
    filters.minEquityPercent = num(state.minEquityPercent);
  }
  if (state.minScore) filters.minScore = num(state.minScore);

  const fields = state.intentFields;

  switch (state.intent) {
    case "vacant":
      filters.vacantOnly = true;
      if (fields.minVacancyMonths) {
        filters.minVacancyMonths = num(fields.minVacancyMonths);
      }
      break;
    case "absentee":
      filters.absenteeOnly = true;
      if (fields.minOwnershipYears) {
        filters.minOwnershipYears = num(fields.minOwnershipYears);
      }
      if (fields.outOfStateOnly === "yes") {
        filters.outOfStateOnly = true;
      }
      break;
    case "pre_foreclosure":
      filters.preForeclosureOnly = true;
      break;
    case "tax_delinquent":
      filters.taxDelinquentOnly = true;
      if (fields.minDelinquentAmount) {
        filters.minDelinquentAmount = num(fields.minDelinquentAmount);
      }
      if (fields.minDelinquentYears) {
        filters.minDelinquentYears = num(fields.minDelinquentYears);
      }
      break;
    case "expired_listings":
      if (fields.minDaysExpired) {
        filters.minDaysExpired = num(fields.minDaysExpired);
      }
      break;
    case "mls_lookup":
      if (fields.mlsNumber) filters.mlsNumber = fields.mlsNumber.trim();
      if (fields.listingStatus) filters.listingStatus = fields.listingStatus;
      break;
    case "emls":
      if (fields.mlsNumber) filters.mlsNumber = fields.mlsNumber.trim();
      if (fields.emlsStatus) filters.emlsStatus = fields.emlsStatus;
      break;
    default:
      break;
  }

  const params: PropertySearchParams = {
    sortBy: state.sortBy,
    filters,
    limit: 250,
  };

  if (state.polygon) {
    params.polygon = state.polygon;
  }

  if (state.areaMode === "county" && state.county.trim()) {
    params.county = state.county.trim();
    if (state.state.trim()) params.state = state.state.trim().toUpperCase();
  } else if (state.areaMode === "zip" && state.zip.trim()) {
    params.zip = state.zip.trim();
  } else if (state.areaMode === "city" && state.city.trim()) {
    params.city = state.city.trim();
    if (state.state.trim()) params.state = state.state.trim().toUpperCase();
  }

  const address = fields.address?.trim();
  const isAddressLookup =
    state.intent === "specific_property" ||
    (Boolean(address) &&
      !state.zip.trim() &&
      !state.city.trim() &&
      !state.county.trim());

  if (address) {
    params.query = address;
  }

  if (isAddressLookup && address) {
    params.lookupMode = "address";
    // Address lookup must not mix with ZIP/city area filters
    delete params.zip;
    delete params.city;
    delete params.county;
    delete params.state;
  } else {
    params.lookupMode = "area";
  }

  if (state.intent === "radius_search" && fields.radiusMiles) {
    params.radiusMiles = num(fields.radiusMiles);
  }

  return params;
}

export function formatAreaSummary(state: SearchWorkspaceState): string {
  if (state.intentFields.address?.trim()) {
    return state.intentFields.address.trim();
  }

  if (state.polygon) return "Custom map area";

  if (state.areaMode === "county" && state.county.trim()) {
    return state.state.trim()
      ? `${state.county.trim()} County, ${state.state.trim().toUpperCase()}`
      : state.county.trim();
  }

  if (state.areaMode === "zip" && state.zip.trim()) {
    return `ZIP ${state.zip.trim()}`;
  }

  if (state.areaMode === "city" && state.city.trim()) {
    return state.state.trim()
      ? `${state.city.trim()}, ${state.state.trim().toUpperCase()}`
      : state.city.trim();
  }

  return "No area selected";
}

/** Human-readable label for what the current search will run. */
export function formatSearchTarget(state: SearchWorkspaceState): {
  kind: "zip" | "address" | "city" | "county" | "none";
  label: string;
  detail: string;
} {
  const address = state.intentFields.address?.trim();
  if (address) {
    return {
      kind: "address",
      label: "Address lookup",
      detail: address,
    };
  }
  if (state.areaMode === "zip" && state.zip.trim().length >= 5) {
    return {
      kind: "zip",
      label: "ZIP search",
      detail: `ZIP ${state.zip.trim()}`,
    };
  }
  if (state.areaMode === "city" && state.city.trim() && state.state.trim()) {
    return {
      kind: "city",
      label: "City search",
      detail: `${state.city.trim()}, ${state.state.trim().toUpperCase()}`,
    };
  }
  if (
    state.areaMode === "county" &&
    state.county.trim() &&
    state.state.trim()
  ) {
    return {
      kind: "county",
      label: "County search",
      detail: `${state.county.trim()} County, ${state.state.trim().toUpperCase()}`,
    };
  }
  return {
    kind: "none",
    label: "No search yet",
    detail: "Enter a ZIP code or full street address",
  };
}

export type LocationSuggestionKind = "zip" | "city" | "county" | "address";

export interface LocationSuggestion {
  id: string;
  kind: LocationSuggestionKind;
  label: string;
  description: string;
  patch: Partial<SearchWorkspaceState>;
}

export type DetectedSearchKind =
  | "zip"
  | "zip_partial"
  | "address"
  | "city"
  | "county"
  | "city_hint"
  | "unknown";

/** Detect whether free-text input is a ZIP, street address, city, or county. */
export function detectSearchInput(raw: string): {
  kind: DetectedSearchKind;
  label: string;
} {
  const q = raw.trim();
  if (!q) return { kind: "unknown", label: "Type a ZIP or address" };

  if (/^(\d{5})(-\d{4})?$/.test(q)) {
    return { kind: "zip", label: "ZIP code" };
  }
  if (/^\d{3,4}$/.test(q)) {
    return { kind: "zip_partial", label: "ZIP code" };
  }

  // Street number + name (e.g. "742 Evergreen Terrace, Springfield, IL 62704")
  if (looksLikeStreetAddress(q)) {
    return { kind: "address", label: "Street address" };
  }

  if (/county/i.test(q) && /,\s*[A-Za-z]{2}$/i.test(q)) {
    return { kind: "county", label: "County" };
  }
  if (/^[A-Za-z][A-Za-z\s.'-]+,\s*[A-Za-z]{2}$/.test(q)) {
    return { kind: "city", label: "City" };
  }
  if (/^[A-Za-z][A-Za-z\s.'-]{2,}$/.test(q)) {
    return { kind: "city_hint", label: "City (add state)" };
  }

  return { kind: "unknown", label: "Location" };
}

function clearAreaPatch(): Partial<SearchWorkspaceState> {
  return {
    zip: "",
    city: "",
    county: "",
    state: "",
    polygon: null,
  };
}

/** Parse free-text location into PropStream-style suggestions. */
export function getLocationSuggestions(query: string): LocationSuggestion[] {
  const q = query.trim();
  if (!q) return [];

  const suggestions: LocationSuggestion[] = [];
  const detected = detectSearchInput(q);

  const zipMatch = q.match(/^(\d{5})(-\d{4})?$/);
  if (zipMatch) {
    suggestions.push({
      id: `zip-${zipMatch[1]}`,
      kind: "zip",
      label: zipMatch[1]!,
      description: "Search all properties in this ZIP",
      patch: {
        areaMode: "zip",
        zip: zipMatch[1]!,
        city: "",
        county: "",
        state: "",
        polygon: null,
        intent: "list_building",
        intentFields: {},
      },
    });
    return suggestions;
  }

  // "Sangamon County, IL"
  const countyMatch = q.match(
    /^([A-Za-z][A-Za-z\s.'-]+?)\s*(?:County)?\s*,\s*([A-Za-z]{2})$/i,
  );
  if (countyMatch && /county/i.test(q)) {
    const county = countyMatch[1]!.replace(/\s+County$/i, "").trim();
    const state = countyMatch[2]!.toUpperCase();
    suggestions.push({
      id: `county-${county}-${state}`,
      kind: "county",
      label: `${county} County, ${state}`,
      description: "Search properties in this county",
      patch: {
        areaMode: "county",
        county,
        state,
        zip: "",
        city: "",
        polygon: null,
        intent: "list_building",
        intentFields: {},
      },
    });
  }

  // "Springfield, IL"
  const cityMatch = q.match(/^([A-Za-z][A-Za-z\s.'-]+)\s*,\s*([A-Za-z]{2})$/);
  if (cityMatch && !/county/i.test(q)) {
    const city = cityMatch[1]!.trim();
    const state = cityMatch[2]!.toUpperCase();
    suggestions.push({
      id: `city-${city}-${state}`,
      kind: "city",
      label: `${city}, ${state}`,
      description: "Search properties in this city",
      patch: {
        areaMode: "city",
        city,
        state,
        zip: "",
        county: "",
        polygon: null,
        intent: "list_building",
        intentFields: {},
      },
    });
    suggestions.push({
      id: `county-from-city-${city}-${state}`,
      kind: "county",
      label: `${city} County, ${state}`,
      description: "County (if applicable)",
      patch: {
        areaMode: "county",
        county: city,
        state,
        zip: "",
        city: "",
        polygon: null,
        intent: "list_building",
        intentFields: {},
      },
    });
  }

  // Partial ZIP while typing
  if (detected.kind === "zip_partial") {
    suggestions.push({
      id: `zip-partial-${q}`,
      kind: "zip",
      label: `${q}…`,
      description: "Keep typing a 5-digit ZIP",
      patch: {
        areaMode: "zip",
        zip: q,
        city: "",
        county: "",
        state: "",
        polygon: null,
      },
    });
  }

  // Full street address → single-property lookup
  if (detected.kind === "address") {
    suggestions.push({
      id: `address-${q}`,
      kind: "address",
      label: q,
      description: "Look up this exact property",
      patch: {
        areaMode: "zip",
        ...clearAreaPatch(),
        intent: "specific_property",
        intentFields: { address: q },
      },
    });
  }

  // Generic city name without state — nudge user
  if (suggestions.length === 0 && detected.kind === "city_hint") {
    suggestions.push({
      id: `hint-city-${q}`,
      kind: "city",
      label: `${q}, ??`,
      description: "Add a state — e.g. Springfield, IL",
      patch: {
        areaMode: "city",
        city: q,
        state: "",
        zip: "",
        county: "",
        polygon: null,
      },
    });
    suggestions.push({
      id: `hint-county-${q}`,
      kind: "county",
      label: `${q} County, ??`,
      description: "Add a state — e.g. Sangamon County, IL",
      patch: {
        areaMode: "county",
        county: q.replace(/\s+County$/i, ""),
        state: "",
        zip: "",
        city: "",
        polygon: null,
      },
    });
  }

  return suggestions;
}

export function locationQueryFromState(state: SearchWorkspaceState): string {
  if (state.intent === "specific_property" && state.intentFields.address) {
    return state.intentFields.address;
  }
  if (state.areaMode === "zip" && state.zip) return state.zip;
  if (state.areaMode === "city" && state.city) {
    return state.state ? `${state.city}, ${state.state}` : state.city;
  }
  if (state.areaMode === "county" && state.county) {
    return state.state
      ? `${state.county} County, ${state.state}`
      : `${state.county} County`;
  }
  return "";
}

export interface AppliedFilterChip {
  id: string;
  label: string;
  clear: Partial<SearchWorkspaceState> | ((state: SearchWorkspaceState) => Partial<SearchWorkspaceState>);
}

export function getAppliedFilterChips(
  state: SearchWorkspaceState,
): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = [];
  const target = formatSearchTarget(state);

  if (target.kind === "address") {
    chips.push({
      id: "address",
      label: `Address · ${target.detail}`,
      clear: {
        intent: "list_building",
        intentFields: {},
        zip: "",
        city: "",
        county: "",
        state: "",
        polygon: null,
      },
    });
  } else if (target.kind !== "none") {
    chips.push({
      id: "area",
      label: `${target.label.replace(" search", "")} · ${target.detail}`,
      clear: {
        zip: "",
        city: "",
        county: "",
        state: "",
        polygon: null,
        intentFields: { ...state.intentFields, address: "" },
      },
    });
  }

  if (
    state.intent !== "list_building" &&
    state.intent !== "specific_property"
  ) {
    chips.push({
      id: "lead-list",
      label: getIntentDefinition(state.intent).label,
      clear: { intent: "list_building", intentFields: {} },
    });
  }

  if (state.minPrice) {
    chips.push({
      id: "minPrice",
      label: `Min $${Number(state.minPrice).toLocaleString()}`,
      clear: { minPrice: "" },
    });
  }
  if (state.maxPrice) {
    chips.push({
      id: "maxPrice",
      label: `Max $${Number(state.maxPrice).toLocaleString()}`,
      clear: { maxPrice: "" },
    });
  }
  if (state.minEquityPercent) {
    chips.push({
      id: "minEquity",
      label: `${state.minEquityPercent}%+ equity`,
      clear: { minEquityPercent: "" },
    });
  }
  if (state.minScore) {
    chips.push({
      id: "minScore",
      label: `Score ${state.minScore}+`,
      clear: { minScore: "" },
    });
  }

  for (const [key, value] of Object.entries(state.intentFields)) {
    if (!value?.trim() || key === "address") continue;
    chips.push({
      id: `field-${key}`,
      label: `${key}: ${value}`,
      clear: (current) => ({
        intentFields: { ...current.intentFields, [key]: "" },
      }),
    });
  }

  return chips;
}

export function formatActiveSummary(state: SearchWorkspaceState): string[] {
  const parts: string[] = [formatAreaSummary(state)];
  parts.push(getIntentDefinition(state.intent).label);

  if (state.minEquityPercent) {
    parts.push(`${state.minEquityPercent}%+ equity`);
  }
  if (state.minScore) {
    parts.push(`Score ${state.minScore}+`);
  }

  return parts.filter((part) => part !== "No area selected");
}

export function getEmptyStateMessage(
  intent: SearchMode,
  options?: { address?: string; zip?: string },
): string {
  if (intent === "specific_property" || options?.address) {
    return options?.address
      ? `No property found for “${options.address}”. Check spelling, include city/state/ZIP, or search a ZIP code instead.`
      : "Property not found. Enter a full street address (e.g. 742 Evergreen Terrace, Springfield, IL 62704).";
  }

  switch (intent) {
    case "vacant":
      return "No vacant properties matched. Try ZIP 62704 with Build a List, then narrow filters.";
    case "mls_lookup":
    case "emls":
      return "No listings matched. Try a different MLS number or listing status.";
    case "expired_listings":
      return "No expired listings found. Try reducing minimum days expired.";
    default:
      return options?.zip
        ? `No properties matched in ZIP ${options.zip}. Try a nearby ZIP or clear filters.`
        : "No properties matched. Enter a 5-digit ZIP for inventory, or a full street address for a single property.";
  }
}

/** @deprecated Use SearchWorkspaceState + buildSearchParams */
export type SearchFilterState = SearchWorkspaceState;
/** @deprecated */
export const defaultFilters = defaultSearchState;
/** @deprecated */
export function filtersToApi(state: SearchWorkspaceState) {
  return buildSearchParams(state);
}
