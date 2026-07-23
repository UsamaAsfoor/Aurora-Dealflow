"use client";

import { formatAddress, formatCurrency, formatPercent } from "@aurora/core";
import { X } from "lucide-react";
import Link from "next/link";
import type { SearchResultItem } from "@/components/search/property-results-list";
import { ScoreBadge } from "@/components/property/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PropertyMapCardProps {
  property: SearchResultItem;
  onClose: () => void;
}

export function PropertyMapCard({ property, onClose }: PropertyMapCardProps) {
  return (
    <div className="ps-map-card w-[320px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
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
              .join(" · ") || "Property overview"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(property.estimatedValue)}
            </p>
            <p className="text-xs text-emerald-700">
              {formatPercent(property.equityPercent)} equity
            </p>
          </div>
          {property.score != null && <ScoreBadge score={property.score} />}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {property.isAbsentee && <Badge variant="outline">Absentee</Badge>}
          {property.isVacant && <Badge variant="warning">Vacant</Badge>}
          {property.isPreForeclosure && (
            <Badge variant="destructive">Pre-FC</Badge>
          )}
          {property.isTaxDelinquent && (
            <Badge variant="destructive">Tax Delinq</Badge>
          )}
        </div>

        <Button asChild className="w-full" size="sm">
          <Link href={`/dashboard/properties/${property.attomId}`}>
            Open details
          </Link>
        </Button>
      </div>
    </div>
  );
}
