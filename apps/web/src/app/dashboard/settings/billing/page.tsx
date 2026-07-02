"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function BillingPage() {
  const utils = trpc.useUtils();
  const subscriptionQuery = trpc.billing.getSubscription.useQuery();
  const usageQuery = trpc.billing.getUsage.useQuery();
  const plansQuery = trpc.billing.listPlans.useQuery();
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      utils.billing.getSubscription.invalidate();
      utils.billing.getUsage.invalidate();
      if (data.url.startsWith("http")) {
        window.location.href = data.url;
      }
    },
  });
  const cancel = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      utils.billing.getSubscription.invalidate();
    },
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Billing & Usage"
          description="Manage your subscription and monitor monthly usage limits."
        />

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">
                {subscriptionQuery.data?.plan.name ?? "Free"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Status: {subscriptionQuery.data?.subscription?.status ?? "active"}
              </p>
              {subscriptionQuery.data?.plan.id !== "free" && (
                <Button
                  className="mt-4"
                  variant="secondary"
                  size="sm"
                  onClick={() => cancel.mutate()}
                >
                  Cancel Subscription
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {usageQuery.data?.usage.map((row) => (
                <div
                  key={row.metric}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize text-slate-600">
                    {row.metric.replace("_", " ")}
                  </span>
                  <Badge variant="outline">
                    {row.used} / {row.limit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {plansQuery.data
              ?.filter((p) => p.id !== "free")
              .map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">{plan.name}</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    ${(plan.priceMonthly / 100).toFixed(0)}/mo
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    disabled={checkout.isPending}
                    onClick={() =>
                      checkout.mutate({
                        planId: plan.id as "pro" | "team",
                      })
                    }
                  >
                    Upgrade to {plan.name}
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
