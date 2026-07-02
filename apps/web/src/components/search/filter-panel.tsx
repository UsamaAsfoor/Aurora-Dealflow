"use client";

import type { PropertySearchFilters } from "@aurora/core";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SearchFilterState {
  query: string;
  city: string;
  state: string;
  zip: string;
  minPrice: string;
  maxPrice: string;
  minEquityPercent: string;
  minScore: string;
  absenteeOnly: boolean;
  vacantOnly: boolean;
  preForeclosureOnly: boolean;
  taxDelinquentOnly: boolean;
  sortBy: "score" | "price" | "equity" | "distance";
}

export const defaultFilters: SearchFilterState = {
  query: "",
  city: "",
  state: "",
  zip: "",
  minPrice: "",
  maxPrice: "",
  minEquityPercent: "",
  minScore: "",
  absenteeOnly: false,
  vacantOnly: false,
  preForeclosureOnly: false,
  taxDelinquentOnly: false,
  sortBy: "score",
};

interface FilterPanelProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export function FilterPanel({
  filters,
  onChange,
  onSearch,
  isLoading,
}: FilterPanelProps) {
  const update = (partial: Partial<SearchFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="query">Address / Search</Label>
        <Input
          id="query"
          placeholder="742 Evergreen Terrace"
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="Springfield"
            value={filters.city}
            onChange={(e) => update({ city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="IL"
            value={filters.state}
            onChange={(e) => update({ state: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="zip">ZIP</Label>
        <Input
          id="zip"
          placeholder="62704"
          value={filters.zip}
          onChange={(e) => update({ zip: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="minPrice">Min Price</Label>
          <Input
            id="minPrice"
            type="number"
            placeholder="100000"
            value={filters.minPrice}
            onChange={(e) => update({ minPrice: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="maxPrice">Max Price</Label>
          <Input
            id="maxPrice"
            type="number"
            placeholder="500000"
            value={filters.maxPrice}
            onChange={(e) => update({ maxPrice: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="minEquity">Min Equity %</Label>
          <Input
            id="minEquity"
            type="number"
            placeholder="50"
            value={filters.minEquityPercent}
            onChange={(e) => update({ minEquityPercent: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="minScore">Min Score</Label>
          <Input
            id="minScore"
            type="number"
            placeholder="40"
            value={filters.minScore}
            onChange={(e) => update({ minScore: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="sortBy">Sort By</Label>
        <select
          id="sortBy"
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          value={filters.sortBy}
          onChange={(e) =>
            update({ sortBy: e.target.value as SearchFilterState["sortBy"] })
          }
        >
          <option value="score">Opportunity Score</option>
          <option value="price">Estimated Value</option>
          <option value="equity">Equity %</option>
          <option value="distance">Distance</option>
        </select>
      </div>

      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Distress Filters
        </p>
        {(
          [
            ["absenteeOnly", "Absentee Owner"],
            ["vacantOnly", "Vacant"],
            ["preForeclosureOnly", "Pre-Foreclosure"],
            ["taxDelinquentOnly", "Tax Delinquent"],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={filters[key]}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            {label}
          </label>
        ))}
      </div>

      <Button className="w-full" onClick={onSearch} disabled={isLoading}>
        {isLoading ? "Searching..." : "Search Properties"}
      </Button>
    </div>
  );
}

export function filtersToApi(
  filters: SearchFilterState,
): {
  query?: string;
  city?: string;
  state?: string;
  zip?: string;
  sortBy?: "score" | "price" | "equity" | "distance";
  filters?: PropertySearchFilters;
} {
  const apiFilters: PropertySearchFilters = {};

  if (filters.minPrice) apiFilters.minPrice = Number(filters.minPrice);
  if (filters.maxPrice) apiFilters.maxPrice = Number(filters.maxPrice);
  if (filters.minEquityPercent) {
    apiFilters.minEquityPercent = Number(filters.minEquityPercent);
  }
  if (filters.minScore) apiFilters.minScore = Number(filters.minScore);
  if (filters.absenteeOnly) apiFilters.absenteeOnly = true;
  if (filters.vacantOnly) apiFilters.vacantOnly = true;
  if (filters.preForeclosureOnly) apiFilters.preForeclosureOnly = true;
  if (filters.taxDelinquentOnly) apiFilters.taxDelinquentOnly = true;

  return {
    query: filters.query || undefined,
    city: filters.city || undefined,
    state: filters.state || undefined,
    zip: filters.zip || undefined,
    sortBy: filters.sortBy,
    filters: Object.keys(apiFilters).length > 0 ? apiFilters : undefined,
  };
}
