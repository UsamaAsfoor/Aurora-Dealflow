"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function DealRoomPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;
  const utils = trpc.useUtils();

  const dealQuery = trpc.deal.getByLeadId.useQuery({ leadId });
  const createDeal = trpc.deal.create.useMutation({
    onSuccess: () => utils.deal.getByLeadId.invalidate({ leadId }),
  });
  const updateDeal = trpc.deal.update.useMutation({
    onSuccess: () => utils.deal.getByLeadId.invalidate({ leadId }),
  });
  const matchedBuyers = trpc.deal.matchBuyers.useQuery(
    { dealRoomId: dealQuery.data?.id ?? "" },
    { enabled: !!dealQuery.data?.id },
  );

  const [arv, setArv] = useState("");
  const [repair, setRepair] = useState("");
  const [fee, setFee] = useState("");

  const deal = dealQuery.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link
          href="/dashboard/deals"
          className="mb-4 inline-block text-sm text-blue-600"
        >
          ← Back to deals
        </Link>

        {!deal ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-slate-600">
                No deal room for this lead yet.
              </p>
              <Button
                onClick={() => createDeal.mutate({ leadId })}
                disabled={createDeal.isPending}
              >
                Open Deal Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Offer Calculator</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      ARV
                    </label>
                    <Input
                      type="number"
                      defaultValue={deal.arv ?? ""}
                      onChange={(e) => setArv(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Repairs
                    </label>
                    <Input
                      type="number"
                      defaultValue={deal.repairEstimate ?? ""}
                      onChange={(e) => setRepair(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">
                      Assignment Fee
                    </label>
                    <Input
                      type="number"
                      defaultValue={deal.assignmentFee ?? ""}
                      onChange={(e) => setFee(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button
                      onClick={() => {
                        const arvNum = Number(arv || deal.arv || 0);
                        const repairNum = Number(repair || deal.repairEstimate || 0);
                        const mao = arvNum * 0.7 - repairNum;
                        updateDeal.mutate({
                          dealRoomId: deal.id,
                          arv: arvNum,
                          repairEstimate: repairNum,
                          mao,
                          assignmentFee: Number(fee || deal.assignmentFee || 0),
                        });
                      }}
                    >
                      Recalculate MAO
                    </Button>
                    <p className="mt-3 text-lg font-bold text-emerald-700">
                      MAO: ${Number(deal.mao ?? 0).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Closing Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(deal.checklist as Array<{ id: string; label: string; done: boolean }> | null)?.map(
                    (item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => {
                            const next = (
                              deal.checklist as Array<{
                                id: string;
                                label: string;
                                done: boolean;
                              }>
                            ).map((row) =>
                              row.id === item.id
                                ? { ...row, done: !row.done }
                                : row,
                            );
                            updateDeal.mutate({
                              dealRoomId: deal.id,
                              checklist: next,
                            });
                          }}
                        />
                        {item.label}
                      </label>
                    ),
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Matched Buyers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchedBuyers.data?.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No matching buyers. Add buyers with buy boxes first.
                  </p>
                ) : (
                  matchedBuyers.data?.map((buyer) => (
                    <div
                      key={buyer.id}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">{buyer.name}</p>
                      <p className="text-slate-500">{buyer.email}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
