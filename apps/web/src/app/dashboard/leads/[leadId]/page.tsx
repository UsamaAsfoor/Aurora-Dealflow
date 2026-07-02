"use client";

import { formatAddress, formatCurrency, formatPercent } from "@aurora/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnalysisPanel, ValueBlock } from "@/components/property/analysis-panel";
import { LeadCrmPanel } from "@/components/crm/lead-crm-panel";
import { SinglePropertyMap } from "@/components/search/property-map";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function LeadProfilePage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;

  const leadQuery = trpc.property.getByLeadId.useQuery({ leadId });
  const analysisQuery = trpc.analysis.getOrGenerate.useQuery({ leadId });

  const data = leadQuery.data;
  const property = data?.property;
  const lead = data?.lead;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link
          href="/dashboard/leads"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>

        {leadQuery.isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : property && lead ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: lead.pipelineStageColor
                        ? `${lead.pipelineStageColor}18`
                        : undefined,
                      color: lead.pipelineStageColor ?? undefined,
                      borderColor: lead.pipelineStageColor
                        ? `${lead.pipelineStageColor}40`
                        : undefined,
                    }}
                  >
                    {lead.pipelineStageName}
                  </Badge>
                  <span className="text-xs text-slate-500">Saved Lead</span>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {formatAddress(property.address)}
                </h1>
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
                      <p className="font-medium text-slate-900">
                        {property.owner?.name ?? "Unknown"}
                      </p>
                      {property.owner && (
                        <p className="text-slate-600">
                          {formatAddress(property.owner.mailingAddress)}
                        </p>
                      )}
                    </div>
                    <div className="text-slate-600">
                      <p>Tax: {formatCurrency(property.tax.annualAmount)}</p>
                      <p>
                        Equity: {formatPercent(property.valuation.equityPercent)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

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

              <div className="space-y-6">
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
                <LeadCrmPanel leadId={leadId} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Lead not found.</p>
        )}
      </div>
    </AppShell>
  );
}
