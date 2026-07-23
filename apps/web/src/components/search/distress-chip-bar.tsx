"use client";

import type { SearchMode } from "@aurora/core";
import { cn } from "@/lib/utils";
import {
  DISTRESS_INTENTS,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";

interface DistressChipBarProps {
  state: SearchWorkspaceState;
  onChange: (intent: SearchMode) => void;
}

export function DistressChipBar({ state, onChange }: DistressChipBarProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Step 2 · Distress intent
        </p>
        <p className="mt-1 text-sm text-slate-600">
          What kind of opportunity are you building a list for?
        </p>
      </div>

      <div className="search-chip-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {DISTRESS_INTENTS.map((intent) => {
          const Icon = intent.icon;
          const active = state.intent === intent.key;

          return (
            <button
              key={intent.key}
              type="button"
              onClick={() => onChange(intent.key)}
              className={cn(
                "search-distress-chip shrink-0",
                active && "search-distress-chip-active",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{intent.label}</span>
              {intent.stub && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Demo
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
