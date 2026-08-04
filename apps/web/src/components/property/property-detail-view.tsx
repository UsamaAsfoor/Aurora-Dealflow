"use client";

import {
  estimateMonthlyRent,
  equityRating,
  formatAddress,
  formatCurrency,
  formatPercent,
  propertyTypeLabel,
  type NormalizedProperty,
} from "@aurora/core";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Home,
  Printer,
  Save,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AnalysisPanel } from "@/components/property/analysis-panel";
import { ComparableSales } from "@/components/property/comparable-sales";
import { SinglePropertyMap } from "@/components/search/property-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

function formatOwnershipLength(years: number | null | undefined): string {
  if (years == null) return "—";
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (whole <= 0 && months <= 0) return "< 1 Month";
  if (whole <= 0) return `${months} Month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${whole} Year${whole === 1 ? "" : "s"}`;
  return `${whole} Year${whole === 1 ? "" : "s"} ${months} Month${months === 1 ? "" : "s"}`;
}

function formatLot(lotSqft: number | null | undefined): string {
  if (lotSqft == null) return "—";
  if (lotSqft >= 43560) return `${(lotSqft / 43560).toFixed(2)} ac`;
  return lotSqft.toLocaleString();
}

function DataRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--color-border)]/70 py-2 text-sm last:border-0">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span
        className={cn(
          "text-right font-medium text-[var(--color-foreground)]",
          emphasize && "font-semibold text-[var(--color-primary)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function HighlightMetric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "equity" | "value" | "mortgage" | "arv";
}) {
  const tones = {
    default: "border-[var(--color-border)] bg-[var(--color-muted)]/25",
    equity:
      "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)]",
    value:
      "border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
    mortgage: "border-[var(--color-border)] bg-[var(--aurora-surface)]",
    arv: "border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)]",
  };

  return (
    <div className={cn("rounded-xl border px-4 py-3", tones[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{sub}</p>
      )}
    </div>
  );
}

function EquityRing({ percent }: { percent: number | null }) {
  const value = percent == null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-primary) ${value * 3.6}deg, color-mix(in srgb, var(--color-border) 80%, transparent) 0deg)`,
        }}
      />
      <div className="absolute inset-3 rounded-full bg-[var(--aurora-surface)]" />
      <div className="relative text-center">
        <p className="text-2xl font-bold text-[var(--color-foreground)]">
          {percent == null ? "—" : `${Math.round(percent)}%`}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Equity
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  title,
  children,
  action,
}: {
  id: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function PropertyDetailView({
  property,
  onSaveLead,
  saving,
}: {
  property: NormalizedProperty;
  onSaveLead: () => void;
  saving?: boolean;
}) {
  // Shares cache with ComparableSales defaults (1 mi / 6 mo) — one network call
  const compsQuery = trpc.property.getComps.useQuery(
    {
      attomId: property.attomId,
      radiusMiles: 1,
      soldWithinMonths: 6,
    },
    { staleTime: 60_000 },
  );
  const analysisQuery = trpc.analysis.getOrGenerate.useQuery(
    { attomId: property.attomId },
    { staleTime: 5 * 60_000 },
  );

  const avm = property.valuation.avm;
  const equity = property.valuation.estimatedEquity;
  const equityPct = property.valuation.equityPercent;
  const mortgage = property.valuation.estimatedMortgageBalance;
  const estimatedArv = compsQuery.data?.estimatedArv ?? avm;
  const avgSale = compsQuery.data?.averageSalePrice ?? null;
  const monthlyRent = estimateMonthlyRent(avm, property.sqft);
  const grossYield =
    monthlyRent != null && avm != null && avm > 0
      ? ((monthlyRent * 12) / avm) * 100
      : null;
  const estWholesale =
    estimatedArv != null ? Math.round(estimatedArv * 0.7) : null;
  const lastSale = property.sales[0] ?? null;

  const navItems = [
    { id: "overview", label: "Overview" },
    { id: "ownership", label: "Ownership" },
    { id: "valuation", label: "Valuation" },
    { id: "mortgage", label: "Mortgage" },
    { id: "tax", label: "Tax" },
    { id: "comps", label: "Comps" },
    { id: "characteristics", label: "Characteristics" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/search"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
            {property.address.line1}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {property.address.city}, {property.address.state}{" "}
            {property.address.zip}
            {property.address.county ? ` · ${property.address.county} County` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
              <BedDouble className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {property.beds ?? "—"} Beds
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
              <Bath className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {property.baths ?? "—"} Baths
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
              <Home className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {property.sqft != null ? `${property.sqft.toLocaleString()} SqFt` : "— SqFt"}
            </span>
            {property.owner?.isAbsentee && <Badge variant="outline">Absentee</Badge>}
            {property.isVacant && <Badge variant="warning">Vacant</Badge>}
            {property.isPreForeclosure && (
              <Badge variant="destructive">Pre-Foreclosure</Badge>
            )}
            {property.tax.isDelinquent && (
              <Badge variant="destructive">Tax Delinquent</Badge>
            )}
            {property.listingStatus && (
              <Badge variant="cyan">{property.listingStatus}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={`#comps`}>Open Comps</a>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={onSaveLead} disabled={saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save as Lead"}
          </Button>
        </div>
      </div>

      {/* Highlight strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <HighlightMetric
          label="Equity (est.)"
          value={formatCurrency(equity)}
          sub={equityRating(equityPct)}
          tone="equity"
        />
        <HighlightMetric
          label="Estimated value"
          value={formatCurrency(avm)}
          sub={
            property.valuation.assessedValue != null
              ? `Assessed ${formatCurrency(property.valuation.assessedValue)}`
              : undefined
          }
          tone="value"
        />
        <HighlightMetric
          label="Mortgage balance"
          value={formatCurrency(mortgage)}
          sub={
            property.openMortgageCount != null
              ? `${property.openMortgageCount} open mortgage${property.openMortgageCount === 1 ? "" : "s"}`
              : undefined
          }
          tone="mortgage"
        />
        <HighlightMetric
          label="Estimated ARV"
          value={formatCurrency(estimatedArv)}
          sub={
            compsQuery.isFetching
              ? "Calculating from comps…"
              : avgSale != null
                ? `Avg sale ${formatCurrency(avgSale)}`
                : "From comps / AVM"
          }
          tone="arv"
        />
        <HighlightMetric
          label="Equity percentage"
          value={formatPercent(equityPct)}
          sub={`Rating: ${equityRating(equityPct)}`}
          tone="equity"
        />
      </div>

      {/* Section nav */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)]/90 p-1">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-5 xl:grid-cols-12">
        {/* Left column */}
        <div className="space-y-5 xl:col-span-4">
          <SectionCard id="overview" title="Overview">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl ring-1 ring-[var(--color-border)]">
                <SinglePropertyMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  label={formatAddress(property.address)}
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-accent)]">
                  <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {propertyTypeLabel(property.propertyType)}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    ATTOM ID {property.attomId}
                  </p>
                </div>
              </div>
              <div>
                <DataRow label="SqFt" value={property.sqft?.toLocaleString() ?? "—"} />
                <DataRow label="Lot Size" value={formatLot(property.lotSqft)} />
                <DataRow label="Year Built" value={property.yearBuilt ?? "—"} />
                <DataRow label="APN" value={property.apn ?? "—"} />
                <DataRow
                  label="Property Type"
                  value={propertyTypeLabel(property.propertyType)}
                />
                <DataRow
                  label="Status"
                  value={
                    property.listingStatus ??
                    (property.isVacant ? "Vacant" : "Off Market / Unknown")
                  }
                />
                <DataRow
                  label="Distressed"
                  value={
                    property.isPreForeclosure || property.tax.isDelinquent
                      ? "Yes"
                      : "No"
                  }
                />
                <DataRow
                  label="Short Sale"
                  value="—"
                />
                <DataRow label="HOA/COA" value="—" />
                <DataRow
                  label="County"
                  value={property.address.county ?? "—"}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard id="ownership" title="Ownership">
            <DataRow
              label="Owner"
              value={property.owner?.name ?? "Unknown Owner"}
            />
            <DataRow label="Owner Type" value={property.ownerType ?? "—"} />
            <DataRow
              label="Owner Status"
              value={
                property.owner
                  ? property.owner.isAbsentee
                    ? "Absentee"
                    : "Owner Occupied"
                  : "—"
              }
            />
            <DataRow
              label="Occupancy"
              value={
                property.isVacant
                  ? "Vacant"
                  : property.owner?.isAbsentee
                    ? "Unknown"
                    : "Occupied"
              }
            />
            <DataRow
              label="Length of Ownership"
              value={formatOwnershipLength(property.ownershipYears)}
            />
            <DataRow
              label="Purchase Method"
              value={property.purchaseMethod ?? "—"}
            />
            {property.owner && (
              <DataRow
                label="Mailing Address"
                value={formatAddress(property.owner.mailingAddress)}
              />
            )}
          </SectionCard>
        </div>

        {/* Middle column */}
        <div className="space-y-5 xl:col-span-4">
          <SectionCard id="valuation" title="Valuation">
            <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] px-4 py-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Current estimated value
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--color-primary)]">
                {formatCurrency(avm)}
              </p>
            </div>
            <DataRow
              label="Assessed Value"
              value={formatCurrency(property.valuation.assessedValue)}
            />
            <DataRow label="Estimated Equity" value={formatCurrency(equity)} emphasize />
            <DataRow
              label="Equity %"
              value={formatPercent(equityPct)}
              emphasize
            />
            <DataRow
              label="Equity Rating"
              value={equityRating(equityPct)}
            />
            <DataRow
              label="Estimated ARV"
              value={formatCurrency(estimatedArv)}
              emphasize
            />
            <div className="mt-4 h-24 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Value context
              </p>
              <div className="mt-3 flex h-10 items-end gap-1.5">
                {[40, 55, 70, 85, 100].map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-t-sm",
                      i === 4
                        ? "bg-[var(--color-primary)]"
                        : "bg-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]",
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted-foreground)]">
                <span>5yr</span>
                <span>3yr</span>
                <span>1yr</span>
                <span>6mo</span>
                <span>Curr</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="mortgage" title="Mortgage & Debt">
            <DataRow
              label="Open Mortgages"
              value={property.openMortgageCount ?? "—"}
            />
            <DataRow
              label="Estimated Balance"
              value={formatCurrency(mortgage)}
              emphasize
            />
            <DataRow label="Involuntary Liens" value="0" />
            <DataRow label="Involuntary Amount" value={formatCurrency(0)} />
            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/15 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Last sale
              </p>
              {lastSale ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-semibold text-[var(--color-foreground)]">
                    {formatCurrency(lastSale.salePrice)}
                  </p>
                  <p className="text-[var(--color-muted-foreground)]">
                    {lastSale.saleDate
                      ? new Date(lastSale.saleDate).toLocaleDateString()
                      : "—"}
                    {lastSale.saleType ? ` · ${lastSale.saleType}` : ""}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
                  No public sale on record
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard id="tax" title="Tax">
            <DataRow
              label="Annual Tax"
              value={formatCurrency(property.tax.annualAmount)}
            />
            <DataRow
              label="Delinquency"
              value={
                property.tax.isDelinquent
                  ? formatCurrency(property.tax.delinquentAmount)
                  : "Current"
              }
              emphasize={property.tax.isDelinquent}
            />
            <DataRow
              label="Tax Status"
              value={property.tax.isDelinquent ? "Delinquent" : "Current"}
            />
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-5 xl:col-span-4">
          <SectionCard id="opportunity" title="Opportunity">
            <EquityRing percent={equityPct} />
            <div className="mt-4 space-y-0">
              <DataRow
                label="Equity (est.)"
                value={formatCurrency(equity)}
                emphasize
              />
              <DataRow
                label="Equity Percentage"
                value={formatPercent(equityPct)}
                emphasize
              />
              <DataRow label="Equity Rating" value={equityRating(equityPct)} />
              <DataRow label="Linked Properties" value="0" />
              <DataRow
                label="Est. Wholesale Price"
                value={formatCurrency(estWholesale)}
              />
              <DataRow
                label="Estimated ARV"
                value={formatCurrency(estimatedArv)}
                emphasize
              />
              <DataRow
                label="Monthly Rent (est.)"
                value={formatCurrency(monthlyRent)}
              />
              <DataRow
                label="Gross Yield (est.)"
                value={
                  grossYield == null ? "—" : `${grossYield.toFixed(1)}%`
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            id="comps-glance"
            title="Comps at a Glance"
            action={
              <a
                href="#comps"
                className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
              >
                Open Comps
              </a>
            }
          >
            <DataRow
              label="Avg. Sale Price"
              value={
                compsQuery.isFetching ? "…" : formatCurrency(avgSale)
              }
            />
            <DataRow
              label="Avg. $/SqFt"
              value={
                compsQuery.data?.averagePricePerSqft != null
                  ? formatCurrency(compsQuery.data.averagePricePerSqft)
                  : "—"
              }
            />
            <DataRow
              label="Comps Found"
              value={
                compsQuery.isFetching
                  ? "…"
                  : String(compsQuery.data?.comps.length ?? 0)
              }
            />
            <DataRow label="Days on Market" value="—" />
            <DataRow
              label="Search Window"
              value="1 mi · 6 months"
            />
          </SectionCard>

          <AnalysisPanel
            analysis={
              analysisQuery.data
                ? {
                    score: analysisQuery.data.score,
                    breakdown: analysisQuery.data.breakdown as Array<{
                      label: string;
                      contribution: number;
                      rawValue: number | boolean | null;
                    }>,
                    summary: analysisQuery.data.summary,
                    strategy: analysisQuery.data.strategy,
                    reasoning: analysisQuery.data.reasoning,
                  }
                : undefined
            }
            isLoading={analysisQuery.isLoading}
          />
        </div>
      </div>

      <div id="comps" className="scroll-mt-24">
        <ComparableSales
          attomId={property.attomId}
          subjectLatitude={property.latitude}
          subjectLongitude={property.longitude}
          subjectLabel={formatAddress(property.address)}
        />
      </div>

      <SectionCard id="characteristics" title="Property Characteristics">
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <DataRow label="Beds" value={property.beds ?? "—"} />
          <DataRow label="Baths" value={property.baths ?? "—"} />
          <DataRow
            label="Living Area"
            value={
              property.sqft != null
                ? `${property.sqft.toLocaleString()} SqFt`
                : "—"
            }
          />
          <DataRow label="Lot Size" value={formatLot(property.lotSqft)} />
          <DataRow label="Year Built" value={property.yearBuilt ?? "—"} />
          <DataRow
            label="Property Type"
            value={propertyTypeLabel(property.propertyType)}
          />
          <DataRow label="APN" value={property.apn ?? "—"} />
          <DataRow
            label="County"
            value={property.address.county ?? "—"}
          />
          <DataRow
            label="Vacancy"
            value={
              property.isVacant
                ? property.vacancyMonths != null
                  ? `Vacant (${property.vacancyMonths} mo)`
                  : "Vacant"
                : "Not vacant"
            }
          />
          <DataRow
            label="Pre-Foreclosure"
            value={property.isPreForeclosure ? "Yes" : "No"}
          />
          <DataRow
            label="MLS #"
            value={property.mlsNumber ?? "—"}
          />
          <DataRow
            label="Listing Status"
            value={property.listingStatus ?? "—"}
          />
          <DataRow
            label="Latitude"
            value={property.latitude?.toFixed(5) ?? "—"}
          />
          <DataRow
            label="Longitude"
            value={property.longitude?.toFixed(5) ?? "—"}
          />
        </div>
      </SectionCard>

      <SectionCard id="history" title="Transaction History">
        {property.sales.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No sale history available for this property.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-4 font-semibold">Date</th>
                  <th className="pb-2 pr-4 font-semibold">Price</th>
                  <th className="pb-2 pr-4 font-semibold">Type / Document</th>
                  <th className="pb-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {property.sales.map((sale, i) => (
                  <tr
                    key={`${sale.saleDate ?? "n"}-${i}`}
                    className="border-b border-[var(--color-border)]/60 text-[var(--color-foreground)]"
                  >
                    <td className="py-3 pr-4">
                      {sale.saleDate
                        ? new Date(sale.saleDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      {formatCurrency(sale.salePrice)}
                    </td>
                    <td className="py-3 pr-4">{sale.saleType ?? "—"}</td>
                    <td className="py-3 text-[var(--color-muted-foreground)]">
                      Public Record
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
