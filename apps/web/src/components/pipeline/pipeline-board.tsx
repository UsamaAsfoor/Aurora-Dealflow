"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatAddress } from "@aurora/core";
import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { trpc, type AppRouter } from "@/lib/trpc";
import type { inferRouterOutputs } from "@aurora/trpc";

type BoardStage = inferRouterOutputs<AppRouter>["pipeline"]["listBoard"][number];
type BoardLead = BoardStage["leads"][number];

const LeadCard = memo(function LeadCard({
  lead,
  dragging,
}: {
  lead: BoardLead;
  dragging?: boolean;
}) {
  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing",
        dragging && "opacity-90 ring-1 ring-[#d4a017]/50",
      )}
    >
      <CardContent className="p-3">
        <p className="text-sm font-semibold text-[#f4efe6]">
          {formatAddress({
            line1: lead.line1,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
          })}
        </p>
        <p className="mt-1 text-xs capitalize text-[#6f675c]">{lead.source}</p>
        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="mt-3 inline-block text-xs font-medium text-[#e0b02a] hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Open lead →
        </Link>
      </CardContent>
    </Card>
  );
});

const SortableLead = memo(function SortableLead({ lead }: { lead: BoardLead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { lead } });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} />
    </div>
  );
});

const StageColumn = memo(function StageColumn({
  stageId,
  name,
  color,
  leads,
}: {
  stageId: string;
  name: string;
  color: string | null;
  leads: BoardLead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  const itemIds = useMemo(() => leads.map((l) => l.id), [leads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-lg border border-[#2e2924] bg-[#1c1916]/80",
        isOver && "ring-1 ring-[#d4a017]/50",
      )}
    >
      <div className="flex items-center justify-between border-b border-[#2e2924] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: color ?? "#d4a017" }}
          />
          <h3 className="text-sm font-semibold text-[#f4efe6]">{name}</h3>
        </div>
        <Badge variant="outline">{leads.length}</Badge>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-y-auto p-3">
          {leads.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#6f675c]">
              Drop leads here
            </p>
          ) : (
            leads.map((lead) => <SortableLead key={lead.id} lead={lead} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
});

function moveLeadOptimistic(
  stages: BoardStage[],
  leadId: string,
  targetStageId: string,
): BoardStage[] {
  let moving: BoardLead | undefined;
  const without = stages.map((stage) => {
    const nextLeads = stage.leads.filter((lead) => {
      if (lead.id === leadId) {
        moving = lead;
        return false;
      }
      return true;
    });
    return nextLeads.length === stage.leads.length
      ? stage
      : { ...stage, leads: nextLeads };
  });
  if (!moving) return stages;
  const lead = moving;
  return without.map((stage) =>
    stage.id === targetStageId
      ? { ...stage, leads: [...stage.leads, lead] }
      : stage,
  );
}

export function PipelineBoard() {
  const utils = trpc.useUtils();
  const boardQuery = trpc.pipeline.listBoard.useQuery(undefined, {
    staleTime: 60_000,
  });
  const moveLead = trpc.pipeline.moveLead.useMutation({
    onMutate: async ({ leadId, stageId }) => {
      await utils.pipeline.listBoard.cancel();
      const previous = utils.pipeline.listBoard.getData();
      if (previous) {
        utils.pipeline.listBoard.setData(
          undefined,
          moveLeadOptimistic(previous, leadId, stageId),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        utils.pipeline.listBoard.setData(undefined, ctx.previous);
      }
    },
    onSettled: () => {
      void utils.pipeline.listBoard.invalidate();
    },
  });
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const stages = boardQuery.data ?? [];
  const leadStageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of stages) {
      for (const lead of stage.leads) {
        map.set(lead.id, stage.id);
      }
    }
    return map;
  }, [stages]);

  function onDragStart(event: DragStartEvent) {
    const lead = event.active.data.current?.lead as BoardLead | undefined;
    setActiveLead(lead ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId || moveLead.isPending) return;

    let targetStageId = overId;
    if (!stages.some((s) => s.id === overId)) {
      targetStageId = leadStageMap.get(overId) ?? "";
    }
    if (!targetStageId) return;

    const currentStageId = leadStageMap.get(leadId);
    if (currentStageId === targetStageId) return;

    moveLead.mutate({ leadId, stageId: targetStageId });
  }

  function onDragCancel() {
    setActiveLead(null);
  }

  if (boardQuery.isLoading) {
    return <p className="text-sm text-[#a39a8d]">Loading pipeline...</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stageId={stage.id}
            name={stage.name}
            color={stage.color}
            leads={stage.leads}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
