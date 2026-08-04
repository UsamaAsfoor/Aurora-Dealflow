"use client";

import { formatAddress } from "@aurora/core";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { stageBadgeStyle } from "@/lib/utils";
import type { inferRouterOutputs } from "@aurora/trpc";
import type { AppRouter } from "@aurora/trpc";

type LeadListItem = inferRouterOutputs<AppRouter>["lead"]["list"][number];

export default function LeadsPage() {
  const leadsQuery = trpc.lead.list.useQuery();
  const exportQuery = trpc.export.leadsCsv.useQuery(undefined, {
    enabled: false,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader
        title="Leads"
        description="Properties saved from search, ready for your pipeline."
      >
        <Button variant="secondary" size="sm" asChild>
          <Link href="/dashboard/search">Search Properties</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            exportQuery.refetch().then(({ data }) => {
              if (!data) return;
              const blob = new Blob([data.content], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = data.filename;
              a.click();
              URL.revokeObjectURL(url);
            });
          }}
        >
          Export CSV
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>
            All Leads {leadsQuery.data ? `(${leadsQuery.data.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : leadsQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_28%,transparent)]">
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No leads yet.
              </p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/dashboard/search">
                  Search properties to save your first lead
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    <th className="pb-4 pr-4 font-semibold">Property</th>
                    <th className="pb-4 pr-4 font-semibold">Stage</th>
                    <th className="pb-4 pr-4 font-semibold">Source</th>
                    <th className="pb-4 pr-4 font-semibold">Saved</th>
                    <th className="pb-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsQuery.data?.map((lead: LeadListItem) => (
                    <tr
                      key={lead.id}
                      className="border-b border-[var(--color-border)]/70 transition-colors hover:bg-[var(--color-muted)]/40"
                    >
                      <td className="py-4 pr-4">
                        <p className="font-medium text-[var(--color-foreground)]">
                          {formatAddress({
                            line1: lead.line1,
                            city: lead.city,
                            state: lead.state,
                            zip: lead.zip,
                          })}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge style={stageBadgeStyle(lead.pipelineStageColor)}>
                          {lead.pipelineStageName}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4 capitalize text-[var(--color-muted-foreground)]">
                        {lead.source}
                      </td>
                      <td className="py-4 pr-4 text-[var(--color-muted-foreground)]">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 font-medium text-[color-mix(in_srgb,var(--color-primary)_55%,white)] transition-colors hover:text-[var(--color-foreground)]"
                        >
                          View
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
