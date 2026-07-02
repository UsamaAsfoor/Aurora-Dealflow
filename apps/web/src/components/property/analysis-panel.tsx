"use client";

import {
  formatCurrency,
  formatPercent,
  strategyLabel,
  type DealStrategy,
} from "@aurora/core";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ScoreBadge, ScoreBandLabel } from "@/components/property/score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SignalBreakdown {
  label: string;
  contribution: number;
  rawValue: number | boolean | null;
}

interface AnalysisPanelProps {
  analysis?: {
    score: number;
    breakdown: SignalBreakdown[];
    summary: string;
    strategy: string;
    reasoning: string;
  } | null;
  isLoading?: boolean;
}

export function AnalysisPanel({ analysis, isLoading }: AnalysisPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Analysis will appear once property data is loaded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <ScoreBadge score={analysis.score} size="lg" />
          <div>
            <ScoreBandLabel score={analysis.score} />
            <p className="text-xs text-slate-500">Deterministic rules-based score</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>

        <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="cyan">Strategy</Badge>
            <span className="font-semibold text-slate-900">
              {strategyLabel(analysis.strategy as DealStrategy)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {analysis.reasoning}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100"
        >
          Signal Breakdown
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {expanded && (
          <div className="space-y-2">
            {analysis.breakdown.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{signal.label}</p>
                  <p className="text-xs text-slate-500">
                    Raw:{" "}
                    {typeof signal.rawValue === "boolean"
                      ? signal.rawValue
                        ? "Yes"
                        : "No"
                      : typeof signal.rawValue === "number"
                        ? signal.rawValue
                        : "—"}
                  </p>
                </div>
                <span className="font-bold text-blue-600">
                  +{signal.contribution.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PropertyStats({
  beds,
  baths,
  sqft,
  yearBuilt,
}: {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
}) {
  const stats = [
    beds != null ? `${beds} bd` : null,
    baths != null ? `${baths} ba` : null,
    sqft != null ? `${sqft.toLocaleString()} sqft` : null,
    yearBuilt != null ? `Built ${yearBuilt}` : null,
  ].filter(Boolean);

  return (
    <p className="mt-1 text-sm text-slate-500">
      {stats.join(" · ") || "No property details"}
    </p>
  );
}

export function ValueBlock({
  avm,
  assessedValue,
  mortgage,
  equity,
  equityPercent,
}: {
  avm: number | null;
  assessedValue: number | null;
  mortgage: number | null;
  equity: number | null;
  equityPercent: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatItem label="AVM" value={formatCurrency(avm)} />
      <StatItem label="Assessed" value={formatCurrency(assessedValue)} />
      <StatItem label="Est. Mortgage" value={formatCurrency(mortgage)} />
      <StatItem
        label="Est. Equity"
        value={`${formatCurrency(equity)} (${formatPercent(equityPercent)})`}
        highlight
      />
    </div>
  );
}

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={
          highlight
            ? "mt-1.5 text-lg font-bold text-emerald-700"
            : "mt-1.5 text-lg font-semibold text-slate-900"
        }
      >
        {value}
      </p>
    </div>
  );
}
