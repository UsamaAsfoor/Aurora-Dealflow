"use client";

import { formatAddress, formatCurrency } from "@aurora/core";
import { useParams, useRouter } from "next/navigation";
import {
  AnalysisPanel,
  PropertyStats,
  ValueBlock,
} from "@/components/property/analysis-panel";
import { SinglePropertyMap } from "@/components/search/property-map";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

export default function PropertyProfilePage() {
  const params = useParams<{ attomId: string }>();
  const router = useRouter();
  const attomId = params.attomId;

  const propertyQuery = trpc.property.getByAttomId.useQuery({ attomId });
  const analysisQuery = trpc.analysis.getOrGenerate.useQuery({ attomId });
  const createLead = trpc.lead.createFromProperty.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/leads/${data.leadId}`);
    },
  });

  const property = propertyQuery.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        {propertyQuery.isLoading ? (
          <ProfileSkeleton />
        ) : property ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {formatAddress(property.address)}
                </h1>
                <PropertyStats
                  beds={property.beds}
                  baths={property.baths}
                  sqft={property.sqft}
                  yearBuilt={property.yearBuilt}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.owner?.isAbsentee && (
                    <Badge variant="outline">Absentee Owner</Badge>
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
              <Button
                onClick={() => createLead.mutate({ attomId })}
                disabled={createLead.isPending}
              >
                {createLead.isPending ? "Saving..." : "Save as Lead"}
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
                    <CardTitle>Owner</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="font-medium text-slate-900">
                      {property.owner?.name ?? "Unknown Owner"}
                    </p>
                    {property.owner && (
                      <p className="text-slate-600">
                        Mailing: {formatAddress(property.owner.mailingAddress)}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tax Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Annual Tax
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatCurrency(property.tax.annualAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Delinquency
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {property.tax.isDelinquent
                          ? formatCurrency(property.tax.delinquentAmount)
                          : "Current"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sale History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {property.sales.length === 0 ? (
                      <p className="text-sm text-slate-500">No sale history available.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                              <th className="pb-3 pr-4 font-semibold">Date</th>
                              <th className="pb-3 pr-4 font-semibold">Price</th>
                              <th className="pb-3 font-semibold">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {property.sales.map((sale, i) => (
                              <tr
                                key={i}
                                className="border-b border-slate-100 text-slate-700"
                              >
                                <td className="py-3 pr-4">
                                  {sale.saleDate
                                    ? new Date(sale.saleDate).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="py-3 pr-4">
                                  {formatCurrency(sale.salePrice)}
                                </td>
                                <td className="py-3">{sale.saleType ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Comparables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {property.comps.length === 0 ? (
                      <p className="text-sm text-slate-500">No comps available.</p>
                    ) : (
                      <div className="space-y-3">
                        {property.comps.map((comp) => (
                          <div
                            key={comp.attomId}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                {formatAddress(comp.address)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {comp.distanceMiles != null &&
                                  `${comp.distanceMiles} mi · `}
                                {comp.saleDate
                                  ? new Date(comp.saleDate).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(comp.salePrice)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
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
                      label={formatAddress(property.address)}
                    />
                  </CardContent>
                </Card>
              </div>

              <div>
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
          </div>
        ) : (
          <p className="text-slate-500">Property not found.</p>
        )}
      </div>
    </AppShell>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
