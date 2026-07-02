"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const campaignQuery = trpc.campaign.get.useQuery({ campaignId });
  const leadsQuery = trpc.lead.list.useQuery();
  const analyticsQuery = trpc.campaign.analytics.useQuery({ campaignId });
  const enrollLeads = trpc.campaign.enrollLeads.useMutation({
    onSuccess: () => {
      campaignQuery.refetch();
      analyticsQuery.refetch();
      setSelectedLeads([]);
    },
  });

  const campaign = campaignQuery.data;

  function toggleLead(leadId: string) {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId],
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link
          href="/dashboard/campaigns"
          className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          ← Back to campaigns
        </Link>

        {campaignQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : campaign ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{campaign.name}</h1>
              <p className="mt-2 text-slate-600">{campaign.description}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Enroll Leads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leadsQuery.data?.map((lead) => (
                    <label
                      key={lead.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLead(lead.id)}
                      />
                      <span className="text-sm text-slate-800">
                        {lead.line1}, {lead.city}
                      </span>
                    </label>
                  ))}
                  <Button
                    disabled={
                      selectedLeads.length === 0 || enrollLeads.isPending
                    }
                    onClick={() =>
                      enrollLeads.mutate({
                        campaignId,
                        leadIds: selectedLeads,
                      })
                    }
                  >
                    Enroll {selectedLeads.length} Lead(s)
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sequence Steps</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {campaign.steps
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((step) => (
                        <div
                          key={step.id}
                          className="rounded-lg border border-slate-200 p-3 text-sm"
                        >
                          <p className="font-medium capitalize text-slate-900">
                            Day {step.delayDays} · {step.channel}
                          </p>
                          <p className="mt-1 text-slate-600">{step.template}</p>
                        </div>
                      ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>Total enrollments: {analyticsQuery.data?.total ?? 0}</p>
                    {analyticsQuery.data?.enrollments.map((row) => (
                      <p key={row.status}>
                        {row.status}: {row.count}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">Campaign not found.</p>
        )}
      </div>
    </AppShell>
  );
}
