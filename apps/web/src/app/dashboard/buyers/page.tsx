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
      setPhone("");
    },
  });
  const updateBuyBox = trpc.buyer.updateBuyBox.useMutation({
    onSuccess: () => utils.buyer.list.invalidate(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [areas, setAreas] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [propertyTypes, setPropertyTypes] = useState("");
  const [strategies, setStrategies] = useState("");
  const [smsConsent, setSmsConsent] = useState(true);

  function openEditor(buyer: NonNullable<typeof buyersQuery.data>[number]) {
    setEditingId(buyer.id);
    const box = buyer.buyBox;
    setAreas(((box?.areas as string[] | null) ?? []).join(", "));
    setMinPrice(box?.minPrice ?? "");
    setMaxPrice(box?.maxPrice ?? "");
    setPropertyTypes(((box?.propertyTypes as string[] | null) ?? []).join(", "));
    setStrategies(((box?.strategies as string[] | null) ?? []).join(", "));
    setSmsConsent(box?.smsConsent ?? false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <PageHeader
          title="Cash Buyers"
          description="Buy boxes drive marketplace matching and SMS/email blasts."
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
            <Input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              disabled={!name || createBuyer.isPending}
              onClick={() =>
                createBuyer.mutate({
                  name,
                  email: email || undefined,
                  phone: phone || undefined,
                  buyBox: {
                    minPrice: 50000,
                    maxPrice: 500000,
                    areas: [],
                    smsConsent: true,
                  },
                })
              }
            >
              Add Buyer
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {buyersQuery.data?.map((buyer) => (
            <Card key={buyer.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {buyer.name}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {buyer.email} {buyer.phone ? `· ${buyer.phone}` : ""}
                    </p>
                    {buyer.buyBox && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Box: $
                        {Number(buyer.buyBox.minPrice ?? 0).toLocaleString()}–
                        {Number(buyer.buyBox.maxPrice ?? 0).toLocaleString()}
                        {buyer.buyBox.smsConsent ? " · SMS ok" : " · no SMS"}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEditor(buyer)}
                  >
                    Edit buy box
                  </Button>
                </div>

                {editingId === buyer.id && (
                  <div className="space-y-3 border-t border-[var(--border)] pt-4">
                    <Input
                      placeholder="Areas (comma-separated)"
                      value={areas}
                      onChange={(e) => setAreas(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Min price"
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <Input
                        placeholder="Max price"
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="Property types"
                      value={propertyTypes}
                      onChange={(e) => setPropertyTypes(e.target.value)}
                    />
                    <Input
                      placeholder="Strategies"
                      value={strategies}
                      onChange={(e) => setStrategies(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <input
                        type="checkbox"
                        checked={smsConsent}
                        onChange={(e) => setSmsConsent(e.target.checked)}
                      />
                      SMS consent for blasts
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={updateBuyBox.isPending}
                        onClick={() =>
                          updateBuyBox.mutate({
                            buyerId: buyer.id,
                            buyBox: {
                              areas: areas
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                              minPrice: Number(minPrice) || undefined,
                              maxPrice: Number(maxPrice) || undefined,
                              propertyTypes: propertyTypes
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                              strategies: strategies
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                              smsConsent,
                            },
                          })
                        }
                      >
                        Save buy box
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
