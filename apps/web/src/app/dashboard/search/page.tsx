"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { FiltersPanel } from "@/components/search/filters-panel";
import { PropertyMap } from "@/components/search/property-map";
import { PropertyMapCard } from "@/components/search/property-map-card";
import { PropertyResultsList } from "@/components/search/property-results-list";
import { SearchTopBar } from "@/components/search/search-top-bar";
import {
  buildSearchParams,
  defaultSearchState,
  getEmptyStateMessage,
  isSearchReady,
  type LocationSuggestion,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";

export default function SearchPage() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [state, setState] = useState<SearchWorkspaceState>(defaultSearchState);
  const [searchParams, setSearchParams] = useState<
    ReturnType<typeof buildSearchParams>
  >(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const updateState = useCallback((partial: Partial<SearchWorkspaceState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const runSearch = useCallback(() => {
    const params = buildSearchParams(state);
    setSearchParams(params);
    setSelectedId(null);
    if (params) setListOpen(true);
  }, [state]);

  const searchQuery = trpc.property.search.useQuery(
    searchParams ?? { sortBy: "score" },
    { enabled: searchParams !== null && Boolean(token) },
  );

  const statusQuery = trpc.property.status.useQuery();
  const results = searchQuery.data?.results ?? [];

  const selectedProperty = useMemo(
    () => results.find((item) => item.attomId === selectedId) ?? null,
    [results, selectedId],
  );

  const handleLocationSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      setState((current) => {
        const next: SearchWorkspaceState = {
          ...current,
          ...suggestion.patch,
          intentFields: suggestion.patch.intentFields
            ? { ...current.intentFields, ...suggestion.patch.intentFields }
            : current.intentFields,
        };
        const params = buildSearchParams(next);
        if (params) {
          queueMicrotask(() => {
            setSearchParams(params);
            setListOpen(true);
            setSelectedId(null);
          });
        }
        return next;
      });
    },
    [],
  );

  return (
    <AppShell>
      <div className="ps-search-stage relative h-[100dvh] w-full lg:h-screen">
        <PropertyMap
          results={results}
          selectedId={selectedId}
          onPropertyClick={(attomId) => {
            setSelectedId(attomId);
            setListOpen(true);
          }}
          onPolygonChange={(polygon) => updateState({ polygon })}
          className="absolute inset-0 h-full w-full"
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute left-3 right-3 top-3 sm:left-4 sm:right-auto sm:w-[min(640px,calc(100%-2rem))] lg:left-4">
            <SearchTopBar
              state={state}
              onChange={updateState}
              onLocationSelect={handleLocationSelect}
              onOpenFilters={() => setFiltersOpen(true)}
              resultCount={searchParams ? results.length : undefined}
              isLoading={searchQuery.isFetching}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="shadow-lg shadow-slate-900/10"
                disabled={!isSearchReady(state) || searchQuery.isFetching}
                onClick={runSearch}
              >
                {searchQuery.isFetching
                  ? "Searching…"
                  : searchParams
                    ? `View ${results.length} Properties`
                    : "View Properties"}
              </Button>
              {statusQuery.data?.isDemoMode && (
                <Badge variant="warning" className="shadow-sm">
                  Demo Data
                </Badge>
              )}
              {results.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shadow-lg shadow-slate-900/10 lg:hidden"
                  onClick={() => setListOpen((open) => !open)}
                >
                  {listOpen ? "Hide list" : "Show list"}
                </Button>
              )}
            </div>
          </div>

          {searchParams !== null && (
            <div
              className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex max-h-[55vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200 sm:bottom-4 sm:left-4 sm:right-auto sm:top-36 sm:max-h-none sm:w-[380px] sm:rounded-2xl ${
                listOpen ? "ps-results-rail flex" : "hidden sm:flex"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Results
                    {searchParams != null && (
                      <span className="ml-1 text-slate-500">
                        ({results.length})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Select a card or map pin for details
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 sm:hidden"
                  onClick={() => setListOpen(false)}
                >
                  Close
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {searchQuery.error ? (
                  <div className="px-4 py-8 text-sm text-red-700">
                    <p className="font-medium">Search failed</p>
                    <p className="mt-1 text-red-600/90">
                      {searchQuery.error.message}
                    </p>
                    {searchQuery.error.message.includes("UNAUTHORIZED") && (
                      <button
                        type="button"
                        className="mt-3 text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
                        onClick={() => {
                          logout();
                          router.replace("/login");
                        }}
                      >
                        Sign in again
                      </button>
                    )}
                  </div>
                ) : (
                  <PropertyResultsList
                    dense
                    results={results}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    isLoading={
                      searchQuery.isFetching && searchParams !== null
                    }
                    emptyMessage={
                      searchParams === null
                        ? "Search a ZIP (e.g. 62704), then open Filters or View Properties."
                        : getEmptyStateMessage(state.intent)
                    }
                    intentLabel={
                      searchParams !== null ? state.intent : undefined
                    }
                  />
                )}
              </div>
            </div>
          )}

          {selectedProperty && (
            <div className="pointer-events-auto absolute bottom-4 right-4 z-30 hidden sm:block">
              <PropertyMapCard
                property={selectedProperty}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>

        <FiltersPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          state={state}
          onChange={updateState}
          onViewProperties={runSearch}
          resultCount={searchParams ? results.length : undefined}
          isLoading={searchQuery.isFetching}
        />
      </div>
    </AppShell>
  );
}
