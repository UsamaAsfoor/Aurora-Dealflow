"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  defaultFilters,
  FilterPanel,
  filtersToApi,
  type SearchFilterState,
} from "@/components/search/filter-panel";
import { PropertyMap } from "@/components/search/property-map";
import { PropertyResultsList } from "@/components/search/property-results-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilterState>(defaultFilters);
  const [searchParams, setSearchParams] = useState<
    ReturnType<typeof filtersToApi> | null
  >(null);

  const searchQuery = trpc.property.search.useQuery(
    searchParams ?? { sortBy: "score" },
    { enabled: searchParams !== null },
  );

  const statusQuery = trpc.property.status.useQuery();

  const handleSearch = useCallback(() => {
    setSearchParams(filtersToApi(filters));
  }, [filters]);

  const results = searchQuery.data?.results ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Property Search"
          description="Search markets, filter distressed properties, and sort by opportunity score."
        >
          {statusQuery.data?.isDemoMode && (
            <Badge variant="warning">Demo Data Mode</Badge>
          )}
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onSearch={handleSearch}
                isLoading={searchQuery.isFetching}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">
                  Results {results.length > 0 && `(${results.length})`}
                </h2>
              </div>
              <div className="max-h-[640px] overflow-y-auto">
                <PropertyResultsList
                  results={results}
                  isLoading={searchQuery.isFetching && searchParams !== null}
                />
                {searchParams === null && (
                  <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                      <span className="text-xl">🔍</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Enter search criteria and click Search Properties.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Map</h2>
              </div>
              <div className="h-[640px]">
                <PropertyMap
                  results={results}
                  onPropertyClick={(attomId) =>
                    router.push(`/dashboard/properties/${attomId}`)
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
