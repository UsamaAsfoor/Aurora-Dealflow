"use client";

import { formatAddress, formatCurrency, formatPercent } from "@aurora/core";
import { ScoreBadge } from "@/components/property/score-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function PropertyResultCard({
  property,
  selected,
  onSelect,
  dense,
}: {
  property: SearchResultItem;
  selected?: boolean;
  onSelect?: (attomId: string) => void;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(property.attomId)}
      className={cn(
        "ps-result-card w-full text-left transition-all",
        dense
          ? "border-b border-slate-100 px-3 py-3 hover:bg-slate-50"
          : "rounded-xl ring-1 ring-slate-200 hover:ring-blue-300",
        selected &&
          (dense
            ? "bg-blue-50/80"
            : "ring-2 ring-blue-500"),
      )}
    >
      <div className={cn("flex gap-3", !dense && "p-3")}>
        {property.score != null && (
          <div className="pt-0.5">
            <ScoreBadge score={property.score} size={dense ? "sm" : "md"} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {formatAddress(property.address)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
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
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-semibold text-slate-800">
              {formatCurrency(property.estimatedValue)}
            </span>
            <span className="text-emerald-700">
              {formatPercent(property.equityPercent)} equity
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {property.isAbsentee && (
              <Badge variant="outline" className="text-[10px]">
                Absentee
              </Badge>
            )}
            {property.isVacant && (
              <Badge variant="warning" className="text-[10px]">
                Vacant
              </Badge>
            )}
            {property.isPreForeclosure && (
              <Badge variant="destructive" className="text-[10px]">
                Pre-FC
              </Badge>
            )}
            {property.isTaxDelinquent && (
              <Badge variant="destructive" className="text-[10px]">
                Tax
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function PropertyResultsList({
  results,
  isLoading,
  emptyMessage = "No properties found. Try adjusting your search or filters.",
  intentLabel,
  selectedId,
  onSelect,
  dense = false,
}: {
  results: SearchResultItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  intentLabel?: string;
  selectedId?: string | null;
  onSelect?: (attomId: string) => void;
  dense?: boolean;
}) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", dense ? "p-2" : "p-4")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("w-full", dense ? "h-20" : "h-28")} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600 ring-1 ring-blue-100">
          0
        </div>
        <p className="max-w-xs text-sm text-slate-500">{emptyMessage}</p>
        {intentLabel && (
          <Badge variant="outline" className="capitalize">
            {intentLabel.replace(/_/g, " ")}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn(!dense && "space-y-2 overflow-y-auto p-3")}>
      {results.map((property) => (
        <PropertyResultCard
          key={property.attomId}
          property={property}
          dense={dense}
          selected={selectedId === property.attomId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
