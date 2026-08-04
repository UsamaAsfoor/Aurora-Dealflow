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
import { cn } from "@/lib/utils";

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
      <Card>
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
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--color-muted-foreground)]">
          Analysis will appear once property data is loaded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <ScoreBadge score={analysis.score} size="lg" />
          <div>
            <ScoreBandLabel score={analysis.score} />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Deterministic rules-based score
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {analysis.summary}
        </p>

        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] p-4">
          <div className="flex items-center gap-2">
            <Badge variant="cyan">Strategy</Badge>
            <span className="font-semibold text-[var(--color-foreground)]">
              {strategyLabel(analysis.strategy as DealStrategy)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {analysis.reasoning}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)] px-4 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] hover:bg-[var(--color-muted)]"
        >
          Signal Breakdown
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
        </button>

        {expanded && (
          <div className="space-y-2">
            {analysis.breakdown.map((signal) => (
              <div
                key={signal.label}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">
                    {signal.label}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
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
                <span className="font-bold text-[color-mix(in_srgb,var(--color-primary)_55%,white)]">
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
    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
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
    <div
      className={cn(
        "rounded-xl border p-4",
        highlight
          ? "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)]"
          : "border-[var(--color-border)] bg-[var(--color-muted)]/25",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-lg font-semibold tracking-tight",
          highlight
            ? "font-bold text-[var(--color-success)]"
            : "text-[var(--color-foreground)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
