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
        "w-full text-left transition-colors",
        dense
          ? "border-b border-[var(--color-border)] px-3.5 py-3 hover:bg-[var(--color-accent)]/60"
          : "rounded-xl ring-1 ring-[var(--color-border)] hover:ring-[var(--color-primary)]/40",
        selected &&
          (dense
            ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
            : "ring-2 ring-[var(--color-primary)]"),
      )}
    >
      <div className={cn("flex gap-3", !dense && "p-3.5")}>
        {property.score != null && (
          <div className="pt-0.5">
            <ScoreBadge score={property.score} size={dense ? "sm" : "md"} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
            {formatAddress(property.address)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
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
            <span className="font-semibold text-[var(--color-foreground)]">
              {formatCurrency(property.estimatedValue)}
            </span>
            <span className="text-[var(--color-success)]">
              {formatPercent(property.equityPercent)} equity
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {property.isAbsentee && (
              <Badge variant="outline" className="text-[10px] normal-case">
                Absentee
              </Badge>
            )}
            {property.isVacant && (
              <Badge variant="warning" className="text-[10px] normal-case">
                Vacant
              </Badge>
            )}
            {property.isPreForeclosure && (
              <Badge variant="destructive" className="text-[10px] normal-case">
                Pre-FC
              </Badge>
            )}
            {property.isTaxDelinquent && (
              <Badge variant="destructive" className="text-[10px] normal-case">
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
      <div className={cn("space-y-2", dense ? "p-3" : "p-4")}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={cn("w-full", dense ? "h-20" : "h-28")} />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]">
          0
        </div>
        <p className="max-w-[240px] text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {emptyMessage}
        </p>
        {intentLabel && (
          <Badge variant="outline" className="capitalize normal-case">
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
