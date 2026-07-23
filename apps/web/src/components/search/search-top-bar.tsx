"use client";

import { Filter, X } from "lucide-react";
import { LocationSearchBar } from "@/components/search/location-search-bar";
import {
  getAppliedFilterChips,
  getIntentDefinition,
  type LocationSuggestion,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchTopBarProps {
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
  onLocationSelect: (suggestion: LocationSuggestion) => void;
  onOpenFilters: () => void;
  resultCount?: number;
  isLoading?: boolean;
  className?: string;
}

export function SearchTopBar({
  state,
  onChange,
  onLocationSelect,
  onOpenFilters,
  resultCount,
  isLoading,
  className,
}: SearchTopBarProps) {
  const chips = getAppliedFilterChips(state);

  return (
    <div className={cn("ps-top-bar space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <LocationSearchBar
          state={state}
          onSelect={onLocationSelect}
          className="min-w-[220px] flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 shadow-lg shadow-slate-900/10"
          onClick={onOpenFilters}
        >
          <Filter className="h-4 w-4" />
          Filters
          {state.intent !== "list_building" && (
            <span className="ml-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              1+
            </span>
          )}
        </Button>
        <div className="hidden items-center rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 sm:flex">
          {isLoading
            ? "Updating…"
            : resultCount != null
              ? `${resultCount.toLocaleString()} properties`
              : getIntentDefinition(state.intent).label}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="ps-chip-row flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="ps-chip inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              onClick={() => {
                const patch =
                  typeof chip.clear === "function"
                    ? chip.clear(state)
                    : chip.clear;
                onChange(patch);
              }}
            >
              {chip.label}
              <X className="h-3 w-3 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
