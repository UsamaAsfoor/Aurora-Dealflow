"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgentSidebar,
  type AgentSearchAction,
} from "@/components/search/agent-sidebar";
import { FiltersPanel } from "@/components/search/filters-panel";
import { PropertyMap } from "@/components/search/property-map";
import { PropertyMapCard } from "@/components/search/property-map-card";
import { PropertyResultsList } from "@/components/search/property-results-list";
import { SearchTopBar } from "@/components/search/search-top-bar";
import {
  buildSearchParams,
  defaultSearchState,
  formatSearchTarget,
  getEmptyStateMessage,
  isSearchReady,
  type LocationSuggestion,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { DEFAULT_SEARCH_LIMIT, MAX_SEARCH_FETCH } from "@aurora/core";

export default function SearchPage() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [state, setState] = useState<SearchWorkspaceState>(defaultSearchState);
  const [searchParams, setSearchParams] =
    useState<ReturnType<typeof buildSearchParams>>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [agentOpen, setAgentOpen] = useState(true);

  const updateState = useCallback((partial: Partial<SearchWorkspaceState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const runSearch = useCallback(() => {
    const params = buildSearchParams(state);
    setSearchParams(params);
    setSelectedId(null);
    setListOpen(true);
  }, [state]);

  const handleAgentSearch = useCallback((action: AgentSearchAction) => {
    setState((current) => {
      const address = (action.address ?? action.query)?.trim();

      const next: SearchWorkspaceState = address
        ? {
            ...current,
            areaMode: "zip",
            zip: "",
            city: "",
            county: "",
            state: "",
            polygon: null,
            intent: "specific_property",
            intentFields: { address },
            minPrice: action.minPrice ?? current.minPrice,
            maxPrice: action.maxPrice ?? current.maxPrice,
          }
        : {
            ...current,
            areaMode:
              action.areaMode ?? (action.zip ? "zip" : current.areaMode),
            zip: action.zip ?? current.zip,
            city: action.city ?? current.city,
            state: action.state ?? current.state,
            intent: action.intent ?? current.intent,
            minPrice: action.minPrice ?? current.minPrice,
            maxPrice: action.maxPrice ?? current.maxPrice,
            intentFields: action.zip ? {} : current.intentFields,
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
  }, []);

  const searchQuery = trpc.property.search.useQuery(
    searchParams ?? { sortBy: "score" },
    {
      enabled: searchParams !== null && Boolean(token),
      staleTime: 20_000,
      placeholderData: (prev) => prev,
    },
  );

  const statusQuery = trpc.property.status.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
  const results = searchQuery.data?.results ?? [];
  const totalAvailable = searchQuery.data?.totalAvailable ?? results.length;
  const hasMore = Boolean(searchQuery.data?.hasMore);
  const searchTarget = formatSearchTarget(state);

  const loadMore = useCallback(() => {
    setSearchParams((current) => {
      if (!current) return current;
      const nextLimit = Math.min(
        (current.limit ?? DEFAULT_SEARCH_LIMIT) + DEFAULT_SEARCH_LIMIT,
        MAX_SEARCH_FETCH,
      );
      if (nextLimit === current.limit) return current;
      return { ...current, limit: nextLimit };
    });
  }, []);
  const isAddressLookup =
    searchParams?.lookupMode === "address" || searchTarget.kind === "address";

  const selectedProperty = useMemo(
    () => results.find((item) => item.attomId === selectedId) ?? null,
    [results, selectedId],
  );

  // Address lookups return a single property — select it automatically.
  useEffect(() => {
    if (
      isAddressLookup &&
      !searchQuery.isFetching &&
      results.length === 1 &&
      results[0]
    ) {
      setSelectedId(results[0].attomId);
    }
  }, [isAddressLookup, searchQuery.isFetching, results]);

  const handleLocationSelect = useCallback((suggestion: LocationSuggestion) => {
    setState((current) => {
      const replacesLocationFields =
        suggestion.kind === "zip" ||
        suggestion.kind === "city" ||
        suggestion.kind === "county" ||
        suggestion.kind === "address";

      const next: SearchWorkspaceState = {
        ...current,
        ...suggestion.patch,
        intentFields:
          suggestion.patch.intentFields !== undefined
            ? replacesLocationFields
              ? suggestion.patch.intentFields
              : {
                  ...current.intentFields,
                  ...suggestion.patch.intentFields,
                }
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
  }, []);

  return (
    <div className="ac-search-stage relative flex h-full min-h-0 w-full">
      {/* Map + chrome */}
      <div className="relative min-h-0 min-w-0 flex-1">
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
          <div
            className={`pointer-events-auto absolute left-3 right-3 top-3 sm:left-4 ${
              agentOpen ? "lg:right-4" : "sm:right-4"
            }`}
          >
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
                disabled={!isSearchReady(state) || searchQuery.isFetching}
                onClick={runSearch}
              >
                {searchQuery.isFetching
                  ? isAddressLookup
                    ? "Looking up…"
                    : "Searching…"
                  : isAddressLookup
                    ? "Look up address"
                    : searchParams
                      ? `Search again (${results.length})`
                      : "Search area"}
              </Button>
              {statusQuery.data?.isDemoMode && (
                <Badge variant="warning">Demo data</Badge>
              )}
              {results.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="lg:hidden"
                  onClick={() => setListOpen((open) => !open)}
                >
                  {listOpen ? "Hide dock" : "Show dock"}
                </Button>
              )}
              <Button
                size="sm"
                variant={agentOpen ? "secondary" : "default"}
                className="ml-auto"
                onClick={() => setAgentOpen((v) => !v)}
              >
                <Bot className="mr-1.5 h-3.5 w-3.5" />
                {agentOpen ? "Hide Agent" : "Agent"}
              </Button>
            </div>
          </div>

          <div
            className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-20 flex max-h-[42vh] flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--aurora-surface)]/95 shadow-2xl shadow-black/30 backdrop-blur-xl sm:bottom-4 sm:left-4 sm:right-auto sm:top-auto sm:max-h-[min(420px,50vh)] sm:w-[340px] sm:rounded-2xl ${
              listOpen ? "ac-results-dock flex" : "hidden sm:flex"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-[var(--color-foreground)]">
                  {searchParams === null
                    ? "Search"
                    : isAddressLookup
                      ? "Property"
                      : "Results"}
                  {searchParams !== null && (
                    <span className="ml-1.5 font-normal text-[var(--color-muted-foreground)]">
                      {searchQuery.isFetching
                        ? "…"
                        : totalAvailable > results.length
                          ? `${results.length} of ${totalAvailable.toLocaleString()}`
                          : results.length}
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                  {searchQuery.isFetching
                    ? isAddressLookup
                      ? `Looking up ${searchTarget.detail}`
                      : `Searching ${searchTarget.detail}`
                    : searchParams === null
                      ? "Enter a ZIP for inventory, or a full address for one property"
                      : isAddressLookup
                        ? searchTarget.detail
                        : `${searchTarget.detail} · select a row or pin`}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] sm:hidden"
                onClick={() => setListOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {searchQuery.error ? (
                <div className="px-4 py-8 text-sm text-[var(--color-destructive)]">
                  <p className="font-medium">Search failed</p>
                  <p className="mt-1 opacity-90">{searchQuery.error.message}</p>
                  {searchQuery.error.message.includes("UNAUTHORIZED") && (
                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
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
                <>
                  <PropertyResultsList
                    dense
                    results={results}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    isLoading={searchQuery.isFetching && searchParams !== null}
                    emptyMessage={
                      searchParams === null
                        ? "Try ZIP 62704 for multiple properties, or 742 Evergreen Terrace, Springfield, IL 62704 for a single match."
                        : getEmptyStateMessage(state.intent, {
                            address: state.intentFields.address,
                            zip: state.zip,
                          })
                    }
                    intentLabel={
                      searchParams !== null
                        ? isAddressLookup
                          ? "address lookup"
                          : state.intent
                        : undefined
                    }
                  />
                  {!isAddressLookup &&
                    searchParams !== null &&
                    results.length > 0 &&
                    (hasMore ||
                      (searchParams.limit ?? DEFAULT_SEARCH_LIMIT) <
                        Math.min(totalAvailable, MAX_SEARCH_FETCH)) && (
                      <div className="border-t border-[var(--color-border)] p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          disabled={searchQuery.isFetching}
                          onClick={loadMore}
                        >
                          {searchQuery.isFetching
                            ? "Loading…"
                            : `Load more (${results.length} of ${totalAvailable.toLocaleString()})`}
                        </Button>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>

          {selectedProperty && (
            <div className="pointer-events-auto absolute bottom-4 left-[340px] z-30 hidden sm:block">
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

      {/* Cursor-style Agent sidebar */}
      {agentOpen && (
        <div className="absolute inset-0 z-40 flex min-h-0 lg:relative lg:inset-auto lg:z-0 lg:block lg:w-[380px] lg:shrink-0 xl:w-[400px]">
          <div
            className="absolute inset-0 bg-black/50 lg:hidden"
            onClick={() => setAgentOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex h-full min-h-0 w-[min(100%,400px)] shadow-2xl lg:static lg:w-full lg:shadow-none">
            <AgentSidebar
              open
              onClose={() => setAgentOpen(false)}
              searchState={state}
              resultCount={searchParams ? results.length : undefined}
              onSearchAction={handleAgentSearch}
              className="h-full min-h-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}
