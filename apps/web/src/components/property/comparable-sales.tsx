"use client";

import { formatAddress, formatCurrency } from "@aurora/core";
import type { SoldWithinMonths } from "@aurora/core";
import { useState } from "react";
import { CompsMap } from "@/components/property/comps-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

const RADIUS_OPTIONS = [1, 2, 3, 4, 5] as const;
const WINDOW_OPTIONS: Array<{ value: SoldWithinMonths; label: string }> = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "1 year" },
];

function formatLot(lotSqft: number | null | undefined): string {
  if (lotSqft == null) return "—";
  if (lotSqft >= 43560) {
    return `${(lotSqft / 43560).toFixed(2)} ac`;
  }
  return `${lotSqft.toLocaleString()} sf`;
}

export function ComparableSales({
  attomId,
  subjectLatitude,
  subjectLongitude,
  subjectLabel,
}: {
  attomId: string;
  subjectLatitude: number;
  subjectLongitude: number;
  subjectLabel?: string;
}) {
  const [radiusMiles, setRadiusMiles] = useState(1);
  const [soldWithinMonths, setSoldWithinMonths] =
    useState<SoldWithinMonths>(6);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const compsQuery = trpc.property.getComps.useQuery(
    { attomId, radiusMiles, soldWithinMonths },
    { enabled: Boolean(attomId) },
  );

  const data = compsQuery.data;
  const comps = data?.comps ?? [];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Comparable Sales</CardTitle>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Recently sold nearby properties used to estimate ARV
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            Radius
            <select
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)]"
            >
              {RADIUS_OPTIONS.map((miles) => (
                <option key={miles} value={miles}>
                  {miles} mi
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            Sold within
            <select
              value={soldWithinMonths}
              onChange={(e) =>
                setSoldWithinMonths(Number(e.target.value) as SoldWithinMonths)
              }
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-sm text-[var(--color-foreground)]"
            >
              {WINDOW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="Comps found"
            value={compsQuery.isLoading ? "…" : String(comps.length)}
          />
          <Stat
            label="Average sale price"
            value={
              compsQuery.isLoading
                ? "…"
                : formatCurrency(data?.averageSalePrice ?? null)
            }
          />
          <Stat
            label="Estimated ARV"
            value={
              compsQuery.isLoading
                ? "…"
                : formatCurrency(data?.estimatedArv ?? null)
            }
            emphasize
          />
        </div>

        {data?.averagePricePerSqft != null && (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            ARV uses average sold $/sqft ({formatCurrency(data.averagePricePerSqft)}
            /sf) × subject living area when available; otherwise average sale
            price.
          </p>
        )}

        <CompsMap
          subject={{
            latitude: subjectLatitude,
            longitude: subjectLongitude,
            label: subjectLabel,
          }}
          comps={comps}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="h-[320px] w-full overflow-hidden rounded-xl ring-1 ring-[var(--color-border)]"
        />

        {compsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : compsQuery.error ? (
          <p className="text-sm text-[var(--color-destructive)]">
            Failed to load comps: {compsQuery.error.message}
          </p>
        ) : comps.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No comparable sales in this radius and sold-date window. Try
            expanding the search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-3 font-semibold">Address</th>
                  <th className="pb-2 pr-3 font-semibold">Sale price</th>
                  <th className="pb-2 pr-3 font-semibold">Sale date</th>
                  <th className="pb-2 pr-3 font-semibold">Dist</th>
                  <th className="pb-2 pr-3 font-semibold">Beds</th>
                  <th className="pb-2 pr-3 font-semibold">Baths</th>
                  <th className="pb-2 pr-3 font-semibold">Sqft</th>
                  <th className="pb-2 font-semibold">Lot</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((comp) => (
                  <tr
                    key={comp.attomId}
                    onClick={() => setSelectedId(comp.attomId)}
                    className={cn(
                      "cursor-pointer border-b border-[var(--color-border)]/60 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]/50",
                      selectedId === comp.attomId &&
                        "bg-[var(--color-accent)]/40",
                    )}
                  >
                    <td className="py-3 pr-3 font-medium">
                      {formatAddress(comp.address)}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-[color-mix(in_srgb,var(--color-primary)_55%,white)]">
                      {formatCurrency(comp.salePrice)}
                    </td>
                    <td className="py-3 pr-3">
                      {comp.saleDate
                        ? new Date(comp.saleDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      {comp.distanceMiles != null
                        ? `${comp.distanceMiles.toFixed(2)} mi`
                        : "—"}
                    </td>
                    <td className="py-3 pr-3">{comp.beds ?? "—"}</td>
                    <td className="py-3 pr-3">{comp.baths ?? "—"}</td>
                    <td className="py-3 pr-3">
                      {comp.sqft != null ? comp.sqft.toLocaleString() : "—"}
                    </td>
                    <td className="py-3">{formatLot(comp.lotSqft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tracking-tight",
          emphasize
            ? "text-[color-mix(in_srgb,var(--color-primary)_55%,white)]"
            : "text-[var(--color-foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
