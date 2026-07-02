"use client";

import { formatAddress, formatCurrency, formatPercent } from "@aurora/core";
import Link from "next/link";
import { ScoreBadge } from "@/components/property/score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface SearchResultItem {
  attomId: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  latitude?: number;
  longitude?: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  estimatedValue: number | null;
  equityPercent: number | null;
  isAbsentee: boolean;
  isVacant: boolean;
  isPreForeclosure: boolean;
  isTaxDelinquent: boolean;
  score?: number;
}

export function PropertyResultCard({ property }: { property: SearchResultItem }) {
  return (
    <Link href={`/dashboard/properties/${property.attomId}`}>
      <Card className="surface-card-hover cursor-pointer overflow-hidden">
        <CardContent className="flex gap-4 p-4">
          {property.score != null && <ScoreBadge score={property.score} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">
              {formatAddress(property.address)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {[
                property.beds != null ? `${property.beds} bd` : null,
                property.baths != null ? `${property.baths} ba` : null,
                property.sqft != null
                  ? `${property.sqft.toLocaleString()} sqft`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-800">
                {formatCurrency(property.estimatedValue)}
              </span>
              <span className="text-emerald-700">
                {formatPercent(property.equityPercent)} equity
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {property.isAbsentee && (
                <Badge variant="outline">Absentee</Badge>
              )}
              {property.isVacant && <Badge variant="warning">Vacant</Badge>}
              {property.isPreForeclosure && (
                <Badge variant="destructive">Pre-FC</Badge>
              )}
              {property.isTaxDelinquent && (
                <Badge variant="destructive">Tax Delinq</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function PropertyResultsList({
  results,
  isLoading,
}: {
  results: SearchResultItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">
        No properties found. Try adjusting your search or filters.
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto p-4">
      {results.map((property) => (
        <PropertyResultCard key={property.attomId} property={property} />
      ))}
    </div>
  );
}
