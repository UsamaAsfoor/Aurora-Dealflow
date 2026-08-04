"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
  const publish = trpc.marketplace.publishFromDeal.useMutation();
  const blast = trpc.marketplace.blastMatchedBuyers.useMutation();
  const smsStatus = trpc.comms.smsStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const [arv, setArv] = useState("");
  const [repair, setRepair] = useState("");
  const [fee, setFee] = useState("");
  const [disclaimer, setDisclaimer] = useState(false);

  const deal = dealQuery.data;
  const publishedId = publish.data?.id;

  return (
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
                      const repairNum = Number(
                        repair || deal.repairEstimate || 0,
                      );
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
                {(
                  deal.checklist as Array<{
                    id: string;
                    label: string;
                    done: boolean;
                  }> | null
                )?.map((item) => (
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
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Marketplace Dispo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
                  <input
                    type="checkbox"
                    checked={disclaimer}
                    onChange={(e) => setDisclaimer(e.target.checked)}
                  />
                  I confirm this listing is as-is and I have authority to market
                  it. Buyers must verify independently (TCPA/consent applies to
                  blasts).
                </label>
                <Button
                  className="w-full"
                  disabled={!disclaimer || publish.isPending || !deal}
                  onClick={() =>
                    publish.mutate({
                      dealRoomId: deal!.id,
                      disclaimerAccepted: true,
                      strategy: "wholesale",
                    })
                  }
                >
                  {publishedId ? "Published" : "Publish to Marketplace"}
                </Button>
                {publishedId && (
                  <>
                    <Link
                      href={`/marketplace/${publishedId}`}
                      className="block text-center text-sm text-[var(--accent)]"
                    >
                      View public teaser →
                    </Link>
                    {smsStatus.data?.mode !== "byo_twilio" && (
                      <p className="text-xs text-amber-700">
                        SMS will use demo/platform mode.{" "}
                        <Link
                          href="/dashboard/settings/integrations"
                          className="underline"
                        >
                          Connect your Twilio
                        </Link>{" "}
                        for live buyer SMS.
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={blast.isPending}
                      onClick={() => blast.mutate({ listingId: publishedId })}
                    >
                      Blast matched buyers (SMS + email)
                    </Button>
                    {blast.data && (
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Matched {blast.data.matchedCount} · sent{" "}
                        {blast.data.sentCount}
                        {blast.data.demoMode ? " (demo provider)" : ""}
                      </p>
                    )}
                    {blast.error && (
                      <p className="text-xs text-red-400">
                        {blast.error.message}
                      </p>
                    )}
                  </>
                )}
                {publish.error && (
                  <p className="text-xs text-red-400">
                    {publish.error.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matched Buyers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchedBuyers.data?.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No matching buyers. Add buyers with buy boxes first.
                  </p>
                ) : (
                  matchedBuyers.data?.map((buyer) => (
                    <div
                      key={buyer.id}
                      className="rounded-lg border border-[var(--border)] p-3 text-sm"
                    >
                      <p className="font-medium">{buyer.name}</p>
                      <p className="text-[var(--muted-foreground)]">
                        {buyer.email}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
