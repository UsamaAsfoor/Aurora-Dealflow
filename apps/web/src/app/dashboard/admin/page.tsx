"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function AdminPage() {
  const statsQuery = trpc.admin.getStats.useQuery();
  const usersQuery = trpc.admin.listUsers.useQuery();

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Admin"
          description="Platform stats and user management (admin access required)."
        />

        {statsQuery.error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Admin access required. Set ADMIN_EMAILS in API env.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Users", statsQuery.data?.users],
                ["Leads", statsQuery.data?.leads],
                ["Campaigns", statsQuery.data?.campaigns],
                ["Active Subs", statsQuery.data?.activeSubscriptions],
              ].map(([label, value]) => (
                <Card key={String(label)}>
                  <CardContent className="py-6">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {value ?? "—"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usersQuery.data?.map((user) => (
                    <div
                      key={user.id}
                      className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span>{user.email}</span>
                      <span className="text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
