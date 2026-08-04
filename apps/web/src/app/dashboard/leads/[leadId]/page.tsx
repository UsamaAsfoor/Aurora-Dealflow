"use client";

import { formatAddress, formatCurrency, formatPercent } from "@aurora/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Home } from "lucide-react";
import {
  AnalysisPanel,
  ValueBlock,
} from "@/components/property/analysis-panel";
import { ComparableSales } from "@/components/property/comparable-sales";
import { LeadCrmPanel } from "@/components/crm/lead-crm-panel";
import { SinglePropertyMap } from "@/components/search/property-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { stageBadgeStyle } from "@/lib/utils";

export default function LeadProfilePage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;

  const leadQuery = trpc.property.getByLeadId.useQuery(
    { leadId },
    { staleTime: 30_000 },
  );
  const analysisQuery = trpc.analysis.getOrGenerate.useQuery(
    { leadId },
    { staleTime: 5 * 60_000 },
  );

  const data = leadQuery.data;
  const property = data?.property;
  const lead = data?.lead;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <Link
        href="/dashboard/leads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[color-mix(in_srgb,var(--color-primary)_55%,white)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      {leadQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : leadQuery.isError ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {leadQuery.error.message.includes("UNAUTHORIZED")
            ? "Session expired — sign in again to view this lead."
            : leadQuery.error.message || "Lead not found."}
        </p>
      ) : property && lead ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge style={stageBadgeStyle(lead.pipelineStageColor)}>
                  {lead.pipelineStageName}
                </Badge>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  Saved Lead
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
                {property.address.line1}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {property.address.city}, {property.address.state}{" "}
                {property.address.zip}
                {property.address.county
                  ? ` · ${property.address.county} County`
                  : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
                  <BedDouble className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  {property.beds ?? "—"} Beds
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
                  <Bath className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  {property.baths ?? "—"} Baths
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-foreground)]">
                  <Home className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  {property.sqft != null
                    ? `${property.sqft.toLocaleString()} SqFt`
                    : "— SqFt"}
                </span>
                {property.owner?.isAbsentee && (
                  <Badge variant="outline">Absentee</Badge>
                )}
                {property.isVacant && <Badge variant="warning">Vacant</Badge>}
                {property.isPreForeclosure && (
                  <Badge variant="destructive">Pre-Foreclosure</Badge>
                )}
                {property.tax.isDelinquent && (
                  <Badge variant="destructive">Tax Delinquent</Badge>
                )}
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link href={`/dashboard/deals/${leadId}`}>Open Deal Room</Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Valuation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ValueBlock
                    avm={property.valuation.avm}
                    assessedValue={property.valuation.assessedValue}
                    mortgage={property.valuation.estimatedMortgageBalance}
                    equity={property.valuation.estimatedEquity}
                    equityPercent={property.valuation.equityPercent}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Owner & Tax</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">
                      {property.owner?.name ?? "Unknown"}
                    </p>
                    {property.owner && (
                      <p className="mt-1 text-[var(--color-muted-foreground)]">
                        {formatAddress(property.owner.mailingAddress)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1 text-[var(--color-muted-foreground)]">
                    <p>
                      Tax:{" "}
                      <span className="font-medium text-[var(--color-foreground)]">
                        {formatCurrency(property.tax.annualAmount)}
                      </span>
                    </p>
                    <p>
                      Equity:{" "}
                      <span className="font-medium text-[var(--color-foreground)]">
                        {formatPercent(property.valuation.equityPercent)}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <ComparableSales
                attomId={property.attomId}
                subjectLatitude={property.latitude}
                subjectLongitude={property.longitude}
                subjectLabel={formatAddress(property.address)}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <SinglePropertyMap
                    latitude={property.latitude}
                    longitude={property.longitude}
                  />
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain">
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
              <LeadCrmPanel
                leadId={leadId}
                propertySummary={
                  property ? formatAddress(property.address) : undefined
                }
              />
            </aside>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Lead not found.
        </p>
      )}
    </div>
  );
}
