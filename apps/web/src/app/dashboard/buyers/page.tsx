"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function BuyersPage() {
  const utils = trpc.useUtils();
  const buyersQuery = trpc.buyer.list.useQuery();
  const createBuyer = trpc.buyer.create.useMutation({
    onSuccess: () => {
      utils.buyer.list.invalidate();
      setName("");
      setEmail("");
    },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Cash Buyers"
          description="Manage your buyer database and buy-box criteria for deal matching."
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Buyer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Buyer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              disabled={!name || createBuyer.isPending}
              onClick={() =>
                createBuyer.mutate({
                  name,
                  email: email || undefined,
                  buyBox: { minPrice: 50000, maxPrice: 500000 },
                })
              }
            >
              Add Buyer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyer List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buyersQuery.data?.map((buyer) => (
              <div
                key={buyer.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <p className="font-semibold text-slate-900">{buyer.name}</p>
                <p className="text-sm text-slate-500">{buyer.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
