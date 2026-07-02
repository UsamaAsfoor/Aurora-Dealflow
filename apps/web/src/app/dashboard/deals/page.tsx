"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function DealsPage() {
  const dealsQuery = trpc.deal.list.useQuery();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Deal Rooms"
          description="Active deals with comps, offer calculator, documents, and buyer matching."
        />

        <Card>
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {dealsQuery.data?.length === 0 ? (
              <p className="text-sm text-slate-500">
                No deal rooms yet. Open a lead and click &quot;Open Deal Room&quot;.
              </p>
            ) : (
              <div className="space-y-3">
                {dealsQuery.data?.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {deal.line1}, {deal.city}, {deal.state}
                      </p>
                      <p className="text-sm text-slate-500">
                        MAO: {deal.mao ?? "—"} · Status: {deal.status}
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/deals/${deal.leadId}`}>
                        Open
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
