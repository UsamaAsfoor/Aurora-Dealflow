"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { SearchMode } from "@aurora/core";
import { AreaSelector } from "@/components/search/area-selector";
import {
  ActiveFilterSummary,
  SearchStepIndicator,
} from "@/components/search/active-filter-summary";
import { AdvancedFiltersDrawer } from "@/components/search/advanced-filters-drawer";
import { DistressChipBar } from "@/components/search/distress-chip-bar";
import { DynamicFilterFields } from "@/components/search/dynamic-filter-fields";
import {
  buildSearchParams,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";

interface SearchWorkspaceProps {
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
  onSearchParamsChange: (params: ReturnType<typeof buildSearchParams>) => void;
  isLoading?: boolean;
  resultCount?: number;
}

export function SearchWorkspace({
  state,
  onChange,
  onSearchParamsChange,
  isLoading,
  resultCount,
}: SearchWorkspaceProps) {
  const handleIntentChange = useCallback(
    (intent: SearchMode) => {
      onChange({ intent, intentFields: {} });
    },
    [onChange],
  );

  const runSearch = useCallback(() => {
    onSearchParamsChange(buildSearchParams(state));
  }, [onSearchParamsChange, state]);

  const searchParamsPreview = useMemo(() => buildSearchParams(state), [state]);

  useEffect(() => {
    if (!searchParamsPreview) return;

    const timer = window.setTimeout(() => {
      onSearchParamsChange(searchParamsPreview);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchParamsPreview, onSearchParamsChange]);

  return (
    <div className="search-workspace space-y-5">
      <SearchStepIndicator state={state} />

      <div className="search-workspace-panel space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:p-6">
        <AreaSelector state={state} onChange={onChange} />
        <DistressChipBar state={state} onChange={handleIntentChange} />
        <DynamicFilterFields state={state} onChange={onChange} />
        <AdvancedFiltersDrawer state={state} onChange={onChange} />
      </div>

      <ActiveFilterSummary
        state={state}
        onSearch={runSearch}
        isLoading={isLoading}
        resultCount={resultCount}
      />
    </div>
  );
}
