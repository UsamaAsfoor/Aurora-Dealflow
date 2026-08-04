"use client";

import { formatCurrency, formatPercent, strategyLabel } from "@aurora/core";
import type { DealStrategy } from "@aurora/core";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Clock3,
  Kanban,
  MessageSquare,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn, stageBadgeStyle } from "@/lib/utils";

function deltaLabel(current: number, prior: number) {
  if (prior === 0 && current === 0) return { text: "Flat vs prior week", up: null as boolean | null };
  if (prior === 0) return { text: "+100% vs prior week", up: true };
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return { text: "Flat vs prior week", up: null };
  return {
    text: `${pct > 0 ? "+" : ""}${pct}% vs prior week`,
    up: pct > 0,
  };
}

function shortAddress(line1: string, city: string, state: string) {
  return `${line1}, ${city}, ${state}`;
}

function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "warning"
        ? "text-[var(--color-warning)]"
        : tone === "danger"
          ? "text-[var(--color-destructive)]"
          : "text-[var(--color-foreground)]";

  const body = (
    <Card className={cn(href && "surface-card-hover transition-colors")}>
      <CardContent className="py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className={cn("mt-2 text-3xl font-bold tracking-tight", toneClass)}>
          {value}
        </p>
        {hint && (
          <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function BarChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d) => {
        const height = Math.max(4, (d.count / max) * 100);
        const label = new Date(`${d.date}T12:00:00Z`).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric" },
        );
        return (
          <div
            key={d.date}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${label}: ${d.count} lead${d.count === 1 ? "" : "s"}`}
          >
            <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100">
              {d.count || ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-[color-mix(in_srgb,var(--color-primary)_55%,white)]/80 transition-all group-hover:bg-[color-mix(in_srgb,var(--color-primary)_70%,white)]"
              style={{ height: `${height}%` }}
            />
            <span className="truncate text-[9px] text-[var(--color-muted-foreground)]">
              {new Date(`${d.date}T12:00:00Z`).getUTCDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const overview = trpc.analytics.overview.useQuery(undefined, {
    staleTime: 30_000,
  });

  const data = overview.data;
  const kpis = data?.kpis;
  const weekDelta = kpis
    ? deltaLabel(kpis.leadsThisWeek, kpis.leadsPriorWeek)
    : null;
  const pipelineMax = Math.max(
    1,
    ...(data?.pipeline.map((s) => s.count) ?? [1]),
  );
  const scoreTotal =
    (data?.scoreBands.high ?? 0) +
    (data?.scoreBands.medium ?? 0) +
    (data?.scoreBands.low ?? 0) +
    (data?.scoreBands.unscored ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader
        title="Dashboard"
        description="Pipeline health, deal value, outreach, and what needs your attention."
      >
        <Button variant="secondary" size="sm" asChild>
          <Link href="/dashboard/search">
            <Search className="h-3.5 w-3.5" />
            Search
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/dashboard/pipeline">
            <Kanban className="h-3.5 w-3.5" />
            Open Pipeline
          </Link>
        </Button>
      </PageHeader>

      {overview.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : overview.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {overview.error.message.includes("UNAUTHORIZED")
              ? "Session expired — sign in again to view your dashboard."
              : overview.error.message || "Could not load analytics."}
          </CardContent>
        </Card>
      ) : kpis && data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total leads"
              value={String(kpis.totalLeads)}
              href="/dashboard/leads"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {kpis.leadsThisWeek} new this week
                  {weekDelta && (
                    <span
                      className={cn(
                        "ml-1 inline-flex items-center gap-0.5",
                        weekDelta.up === true && "text-[var(--color-success)]",
                        weekDelta.up === false &&
                          "text-[var(--color-destructive)]",
                      )}
                    >
                      {weekDelta.up === true && (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {weekDelta.up === false && (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {weekDelta.text}
                    </span>
                  )}
                </span>
              }
            />
            <KpiCard
              label="Open deals"
              value={String(kpis.openDeals)}
              href="/dashboard/deals"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  ARV book {formatCurrency(kpis.totalArv)}
                </span>
              }
            />
            <KpiCard
              label="Assignment fee pipeline"
              value={formatCurrency(kpis.totalAssignmentFee)}
              href="/dashboard/deals"
              tone="success"
              hint={
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  MAO total {formatCurrency(kpis.totalMao)}
                </span>
              }
            />
            <KpiCard
              label="Avg opportunity score"
              value={kpis.avgScore != null ? String(kpis.avgScore) : "—"}
              href="/dashboard/leads"
              hint={
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {kpis.scoredLeads} scored · {data.equity.highEquityLeads}{" "}
                  high-equity (50%+)
                </span>
              }
            />
            <KpiCard
              label="Open tasks"
              value={String(kpis.openTasks)}
              tone={kpis.overdueTasks > 0 ? "warning" : "default"}
              hint={
                kpis.overdueTasks > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[var(--color-warning)]">
                    <AlertTriangle className="h-3 w-3" />
                    {kpis.overdueTasks} overdue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    Nothing overdue
                  </span>
                )
              }
            />
            <KpiCard
              label="SMS this week"
              value={String(kpis.smsSent7d)}
              hint={
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {kpis.smsInbound7d} inbound replies
                </span>
              }
            />
            <KpiCard
              label="Active campaigns"
              value={String(kpis.activeCampaigns)}
              href="/dashboard/campaigns"
              hint="Playbooks currently running"
            />
            <KpiCard
              label="Est. equity in book"
              value={formatCurrency(data.equity.totalEstimatedEquity)}
              tone="success"
              hint={
                data.equity.avgEquityPercent != null
                  ? `Avg equity ${formatPercent(data.equity.avgEquityPercent)}`
                  : "From saved lead valuations"
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Pipeline funnel</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/pipeline">
                    View board
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.pipeline.every((s) => s.count === 0) ? (
                  <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                    No leads in your pipeline yet.{" "}
                    <Link
                      href="/dashboard/search"
                      className="text-[color-mix(in_srgb,var(--color-primary)_55%,white)] hover:underline"
                    >
                      Search properties
                    </Link>{" "}
                    to save your first lead.
                  </p>
                ) : (
                  data.pipeline.map((stage) => (
                    <div key={stage.stageId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-[var(--color-foreground)]">
                          {stage.name}
                        </span>
                        <span className="tabular-nums text-[var(--color-muted-foreground)]">
                          {stage.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(stage.count / pipelineMax) * 100}%`,
                            backgroundColor:
                              stage.color ??
                              "color-mix(in srgb, var(--color-primary) 70%, white)",
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Opportunity quality</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  {(
                    [
                      ["high", "High (70+)", "var(--color-success)"],
                      ["medium", "Moderate (40–69)", "var(--color-warning)"],
                      ["low", "Low (<40)", "var(--color-muted-foreground)"],
                      ["unscored", "Unscored", "var(--color-border)"],
                    ] as const
                  ).map(([key, label, colorVar]) => {
                    const value = data.scoreBands[key];
                    const pct =
                      scoreTotal > 0 ? (value / scoreTotal) * 100 : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--color-muted-foreground)]">
                            {label}
                          </span>
                          <span className="tabular-nums text-[var(--color-foreground)]">
                            {value}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: colorVar,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data.strategies.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                      Top strategies
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {data.strategies.slice(0, 4).map((s) => (
                        <Badge key={s.strategy} variant="outline">
                          {strategyLabel(s.strategy as DealStrategy)} ·{" "}
                          {s.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leads added · last 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              {data.leadsByDay.every((d) => d.count === 0) ? (
                <p className="py-10 text-center text-sm text-[var(--color-muted-foreground)]">
                  No new leads in the last two weeks.
                </p>
              ) : (
                <BarChart data={data.leadsByDay} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Needs attention</CardTitle>
                {(data.attention.overdueTasks.length > 0 ||
                  data.attention.staleLeads.length > 0) && (
                  <Badge variant="warning">Action</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Overdue tasks
                  </p>
                  {data.attention.overdueTasks.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      No overdue tasks — nice work.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.attention.overdueTasks.map((task) => (
                        <li key={task.taskId}>
                          <Link
                            href={`/dashboard/leads/${task.leadId}`}
                            className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-3 py-2.5 text-sm transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-foreground)]">
                                {task.title}
                              </p>
                              <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                                {shortAddress(
                                  task.line1,
                                  task.city,
                                  task.state,
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-[var(--color-warning)]">
                              {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : "Overdue"}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Stale leads (7+ days quiet)
                  </p>
                  {data.attention.staleLeads.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      All leads touched recently.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.attention.staleLeads.map((lead) => (
                        <li key={lead.leadId}>
                          <Link
                            href={`/dashboard/leads/${lead.leadId}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--aurora-surface)] px-3 py-2.5 text-sm transition-colors hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[var(--color-foreground)]">
                                {shortAddress(
                                  lead.line1,
                                  lead.city,
                                  lead.state,
                                )}
                              </p>
                              <p className="text-xs text-[var(--color-muted-foreground)]">
                                {lead.stageName}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                              {lead.daysSinceUpdate}d
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Top opportunities</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/leads">
                    All leads
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.topLeads.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                    Save leads from search to see ranked opportunities here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.topLeads.map((lead) => (
                      <li key={lead.leadId}>
                        <Link
                          href={`/dashboard/leads/${lead.leadId}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--color-muted)]/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--color-foreground)]">
                              {shortAddress(lead.line1, lead.city, lead.state)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge
                                style={stageBadgeStyle(lead.stageColor)}
                              >
                                {lead.stageName}
                              </Badge>
                              {lead.equityPercent != null && (
                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                  {formatPercent(lead.equityPercent)} equity
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 text-lg font-bold tabular-nums",
                              lead.score != null && lead.score >= 70
                                ? "text-[var(--color-success)]"
                                : lead.score != null && lead.score >= 40
                                  ? "text-[var(--color-warning)]"
                                  : "text-[var(--color-muted-foreground)]",
                            )}
                          >
                            {lead.score ?? "—"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
                  Activity across your leads will show up here.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.recentActivity.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/dashboard/leads/${item.leadId}`}
                        className="flex items-start justify-between gap-4 py-3 text-sm transition-colors hover:text-[color-mix(in_srgb,var(--color-primary)_55%,white)]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--color-foreground)]">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                            {shortAddress(item.line1, item.city, item.state)}
                            {item.body ? ` · ${item.body}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
