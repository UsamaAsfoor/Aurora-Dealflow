"use client";

import { Filter, Loader2, X } from "lucide-react";
import { LocationSearchBar } from "@/components/search/location-search-bar";
import {
  formatSearchTarget,
  getAppliedFilterChips,
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
  const target = formatSearchTarget(state);

  return (
    <div className={cn("ac-top-bar space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <LocationSearchBar
          state={state}
          onSelect={onLocationSelect}
          className="min-w-[220px] flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          className="h-[42px] shrink-0 rounded-xl"
          onClick={onOpenFilters}
        >
          <Filter className="h-4 w-4" />
          Filters
          {state.intent !== "list_building" &&
            state.intent !== "specific_property" && (
              <span className="ml-0.5 rounded-md bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-foreground)]">
                1+
              </span>
            )}
        </Button>
        <div className="hidden h-[42px] min-w-[140px] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)]/95 px-3.5 text-xs font-medium text-[var(--color-muted-foreground)] shadow-lg shadow-black/20 backdrop-blur-md sm:flex">
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
              {target.kind === "address" ? "Looking up…" : "Searching…"}
            </>
          ) : resultCount != null ? (
            <span>
              <span className="font-semibold text-[var(--color-foreground)]">
                {resultCount.toLocaleString()}
              </span>{" "}
              {target.kind === "address"
                ? resultCount === 1
                  ? "property"
                  : "matches"
                : "properties"}
            </span>
          ) : (
            <span className="truncate">{target.label}</span>
          )}
        </div>
      </div>

      {target.kind !== "none" && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)]/80 bg-[var(--aurora-surface)]/90 px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] shadow-sm backdrop-blur-md">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              target.kind === "address"
                ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                : "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)]",
            )}
          >
            {target.label}
          </span>
          <span className="min-w-0 truncate font-medium text-[var(--color-foreground)]">
            {target.detail}
          </span>
          {isLoading && (
            <span className="ml-auto shrink-0 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {target.kind === "address"
                ? "Finding property…"
                : "Loading inventory…"}
            </span>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="ac-chip inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)]/95 px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)] shadow-sm transition hover:border-[var(--color-primary)]/30 hover:text-[var(--color-foreground)]"
              onClick={() => {
                const patch =
                  typeof chip.clear === "function"
                    ? chip.clear(state)
                    : chip.clear;
                onChange(patch);
              }}
            >
              <span className="max-w-[240px] truncate">{chip.label}</span>
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
