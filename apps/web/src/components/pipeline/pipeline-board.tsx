"use client";

import { formatAddress } from "@aurora/core";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export function PipelineBoard() {
  const utils = trpc.useUtils();
  const boardQuery = trpc.pipeline.listBoard.useQuery();
  const moveLead = trpc.pipeline.moveLead.useMutation({
    onSuccess: () => utils.pipeline.listBoard.invalidate(),
  });

  if (boardQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading pipeline...</p>;
  }

  const stages = boardQuery.data ?? [];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="flex w-80 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: stage.color ?? "#64748b" }}
              />
              <h3 className="text-sm font-semibold text-slate-900">
                {stage.name}
              </h3>
            </div>
            <Badge variant="outline">{stage.leads.length}</Badge>
          </div>
          <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto p-3">
            {stage.leads.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No leads</p>
            ) : (
              stage.leads.map((lead) => (
                <Card key={lead.id} className="surface-card-hover">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatAddress({
                        line1: lead.line1,
                        city: lead.city,
                        state: lead.state,
                        zip: lead.zip,
                      })}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {lead.source}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <select
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                        value={stage.id}
                        onChange={(e) =>
                          moveLead.mutate({
                            leadId: lead.id,
                            stageId: e.target.value,
                          })
                        }
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to {s.name}
                          </option>
                        ))}
                      </select>
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Open lead →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
