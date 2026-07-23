"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchWorkspaceState } from "@/components/search/search-intents";

interface AdvancedFiltersDrawerProps {
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
}

export function AdvancedFiltersDrawer({
  state,
  onChange,
}: AdvancedFiltersDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Advanced filters</p>
          <p className="text-xs text-slate-500">
            Price, equity, opportunity score, and sort order
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="grid gap-4 border-t border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="minPrice">Min price</Label>
            <Input
              id="minPrice"
              type="number"
              placeholder="100000"
              value={state.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="maxPrice">Max price</Label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="500000"
              value={state.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="minEquity">Min equity %</Label>
            <Input
              id="minEquity"
              type="number"
              placeholder="50"
              value={state.minEquityPercent}
              onChange={(e) => onChange({ minEquityPercent: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="minScore">Min score</Label>
            <Input
              id="minScore"
              type="number"
              placeholder="40"
              value={state.minScore}
              onChange={(e) => onChange({ minScore: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="sortBy">Sort by</Label>
            <select
              id="sortBy"
              className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={state.sortBy}
              onChange={(e) =>
                onChange({
                  sortBy: e.target.value as SearchWorkspaceState["sortBy"],
                })
              }
            >
              <option value="score">Opportunity score</option>
              <option value="price">Estimated value</option>
              <option value="equity">Equity %</option>
              <option value="distance">Distance</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
