"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatActiveSummary,
  getIntentDefinition,
  isSearchReady,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";

interface ActiveFilterSummaryProps {
  state: SearchWorkspaceState;
  onSearch: () => void;
  isLoading?: boolean;
  resultCount?: number;
}

export function ActiveFilterSummary({
  state,
  onSearch,
  isLoading,
  resultCount,
}: ActiveFilterSummaryProps) {
  const ready = isSearchReady(state);
  const summary = formatActiveSummary(state);

  return (
    <div className="search-summary-bar flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {ready ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {summary.map((part) => (
              <Badge key={part} variant="outline">
                {part}
              </Badge>
            ))}
            {state.polygon && (
              <Badge variant="outline">Map polygon</Badge>
            )}
            {resultCount != null && resultCount > 0 && (
              <span className="text-sm text-slate-500">
                {resultCount} properties
              </span>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Choose an area and distress type to build your list
          </p>
        )}
      </div>

      <Button
        onClick={onSearch}
        disabled={!ready || isLoading}
        className={ready ? "search-ready-pulse" : undefined}
      >
        {isLoading ? "Searching..." : "Search Properties"}
      </Button>
    </div>
  );
}

interface SearchStepIndicatorProps {
  state: SearchWorkspaceState;
}

export function SearchStepIndicator({ state }: SearchStepIndicatorProps) {
  const areaDone =
    state.polygon != null ||
    state.county.trim() ||
    state.zip.trim() ||
    (state.city.trim() && state.state.trim());

  const steps = [
    { label: "Area", done: Boolean(areaDone) },
    { label: "Intent", done: Boolean(state.intent) },
    {
      label: "Refine",
      done:
        getIntentDefinition(state.intent).fields.length === 0 ||
        Object.values(state.intentFields).some((value) => value.trim()),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {steps.map((step, index) => (
        <span key={step.label} className="inline-flex items-center gap-1.5">
          <span
            className={
              step.done
                ? "font-semibold text-blue-600"
                : "font-medium text-slate-400"
            }
          >
            {index + 1}. {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className="text-slate-300">→</span>
          )}
        </span>
      ))}
    </div>
  );
}
