"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function CampaignsPage() {
  const utils = trpc.useUtils();
  const campaignsQuery = trpc.campaign.list.useQuery();
  const templatesQuery = trpc.campaign.listTemplates.useQuery();
  const createFromTemplate = trpc.campaign.createFromTemplate.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      utils.campaign.listTemplates.invalidate();
    },
  });
  const activate = trpc.campaign.activate.useMutation({
    onSuccess: () => utils.campaign.list.invalidate(),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Campaigns"
          description="Launch prebuilt playbooks with automated follow-up sequences."
        />

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Prebuilt Playbooks
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templatesQuery.data?.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{template.description}</p>
                  <Button
                    size="sm"
                    disabled={createFromTemplate.isPending}
                    onClick={() =>
                      createFromTemplate.mutate({ templateId: template.id })
                    }
                  >
                    Use Playbook
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignsQuery.data?.length === 0 ? (
              <p className="text-sm text-slate-500">
                No campaigns yet. Clone a playbook above to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {campaignsQuery.data?.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {campaign.name}
                        </p>
                        <Badge
                          variant={
                            campaign.status === "active" ? "success" : "outline"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {campaign.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status !== "active" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            activate.mutate({ campaignId: campaign.id })
                          }
                        >
                          Activate
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/dashboard/campaigns/${campaign.id}`}>
                          Manage
                        </Link>
                      </Button>
                    </div>
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
