"use client";

import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Home,
  MessageSquare,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme, type ThemeId, type ThemeMeta } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Mini product chrome rendered with that theme’s CSS variables. */
function ThemePreviewChrome({ meta }: { meta: ThemeMeta }) {
  return (
    <div
      data-theme={meta.id}
      data-scheme={meta.scheme}
      className="overflow-hidden rounded-xl border border-[var(--aurora-border)] bg-[var(--aurora-bg)] text-[var(--aurora-fg)] shadow-[var(--aurora-card-shadow)]"
      style={{ colorScheme: meta.scheme }}
    >
      <div className="flex items-center justify-between border-b border-[var(--aurora-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold"
            style={{
              backgroundColor: "var(--aurora-primary)",
              color: "var(--aurora-primary-fg)",
            }}
          >
            A
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-tight">
              Aurora DealFlow
            </p>
            <p
              className="text-[9px]"
              style={{ color: "var(--aurora-muted-fg)" }}
            >
              {meta.label} preview
            </p>
          </div>
        </div>
        <span
          className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{
            backgroundColor: "var(--aurora-accent)",
            color: "var(--aurora-muted-fg)",
          }}
        >
          {meta.scheme}
        </span>
      </div>

      <div className="grid grid-cols-[72px_1fr]">
        <aside
          className="space-y-1.5 border-r border-[var(--aurora-border)] px-2 py-3"
          style={{ backgroundColor: "var(--aurora-bg)" }}
        >
          {["Home", "Search", "Leads"].map((label, i) => (
            <div
              key={label}
              className="rounded-md px-1.5 py-1 text-[9px] font-medium"
              style={
                i === 0
                  ? {
                      backgroundColor: "var(--aurora-accent)",
                      color: "var(--aurora-primary)",
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--aurora-primary) 35%, transparent)`,
                    }
                  : { color: "var(--aurora-muted-fg)" }
              }
            >
              {label}
            </div>
          ))}
        </aside>

        <div className="space-y-2.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-bold tracking-tight">
                1847 Maple Ave
              </p>
              <p
                className="text-[10px]"
                style={{ color: "var(--aurora-muted-fg)" }}
              >
                Springfield, IL · Absentee
              </p>
            </div>
            <span
              className="rounded-md px-2 py-1 text-[10px] font-bold"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--aurora-success) 18%, transparent)",
                color: "var(--aurora-success)",
              }}
            >
              84
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { icon: BedDouble, label: "3 Beds" },
              { icon: Bath, label: "2 Baths" },
              { icon: Home, label: "1,420 SqFt" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--aurora-border)] px-1.5 py-0.5 text-[9px]"
                style={{ backgroundColor: "var(--aurora-surface)" }}
              >
                <Icon
                  className="h-2.5 w-2.5"
                  style={{ color: "var(--aurora-primary)" }}
                />
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Equity", value: "$186k", tone: "success" as const },
              { label: "AVM", value: "$312k", tone: "primary" as const },
              { label: "Tasks", value: "2 open", tone: "muted" as const },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[var(--aurora-border)] px-2 py-1.5"
                style={{
                  backgroundColor:
                    stat.tone === "success"
                      ? "color-mix(in srgb, var(--aurora-success) 10%, var(--aurora-surface))"
                      : stat.tone === "primary"
                        ? "color-mix(in srgb, var(--aurora-primary) 10%, var(--aurora-surface))"
                        : "var(--aurora-muted)",
                }}
              >
                <p
                  className="text-[8px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--aurora-muted-fg)" }}
                >
                  {stat.label}
                </p>
                <p className="mt-0.5 text-[11px] font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              className="rounded-md px-2.5 py-1.5 text-[10px] font-semibold"
              style={{
                backgroundColor: "var(--aurora-primary)",
                color: "var(--aurora-primary-fg)",
              }}
            >
              Save lead
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--aurora-border)] px-2.5 py-1.5 text-[10px] font-semibold"
              style={{
                backgroundColor: "var(--aurora-surface)",
                color: "var(--aurora-fg)",
              }}
            >
              Open CRM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeSampleCard({
  meta,
  active,
  onSelect,
}: {
  meta: ThemeMeta;
  active: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(meta.id)}
      className={cn(
        "group w-full rounded-2xl border p-3 text-left transition",
        active
          ? "border-[color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
          : "border-[var(--color-border)] bg-[var(--aurora-surface)]/40 hover:border-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))]",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: meta.swatch }}
            />
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              {meta.label}
            </p>
            <Badge variant="outline">{meta.scheme}</Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            {meta.description}
          </p>
        </div>
        {active && (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--color-primary)_55%,white)]">
            Active
          </span>
        )}
      </div>
      <ThemePreviewChrome meta={meta} />
    </button>
  );
}

export default function AppearancePage() {
  const { theme, setTheme, darkThemes, lightThemes } = useTheme();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <PageHeader
        title="Appearance"
        description="Ten sample UI modes for client review — five dark, five light. Click a card to apply it across the app."
      >
        <Badge variant="cyan">{theme}</Badge>
      </PageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Target,
            label: "Modes",
            value: "10",
            hint: "5 dark · 5 light",
          },
          {
            icon: TrendingUp,
            label: "Tokens",
            value: "CSS vars",
            hint: "Live across dashboard",
          },
          {
            icon: MessageSquare,
            label: "Agent UI",
            value: "Synced",
            hint: "Sidebar + chat chrome",
          },
          {
            icon: ArrowUpRight,
            label: "Active",
            value: theme,
            hint: "Saved in this browser",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-start gap-3 py-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40">
                <item.icon className="h-4 w-4 text-[color-mix(in_srgb,var(--color-primary)_55%,white)]" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  {item.label}
                </p>
                <p className="mt-0.5 text-lg font-bold capitalize text-[var(--color-foreground)]">
                  {item.value}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {item.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mb-10 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Dark modes
            </h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Night desks for dense CRM and map work.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {darkThemes.map((meta) => (
            <ThemeSampleCard
              key={meta.id}
              meta={meta}
              active={theme === meta.id}
              onSelect={setTheme}
            />
          ))}
        </div>
      </section>

      <section className="mb-10 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
            Light modes
          </h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Bright surfaces for underwriting, field notes, and client screenshare.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {lightThemes.map((meta) => (
            <ThemeSampleCard
              key={meta.id}
              meta={meta}
              active={theme === meta.id}
              onSelect={setTheme}
            />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Live component strip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            These use the active theme tokens — switch modes above to sample
            buttons, badges, and cards in context.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="secondary">
              Secondary
            </Button>
            <Button size="sm" variant="outline">
              Outline
            </Button>
            <Button size="sm" variant="ghost">
              Ghost
            </Button>
            <Button size="sm" variant="destructive">
              Destructive
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="cyan">Strategy</Badge>
            <Badge variant="success">High equity</Badge>
            <Badge variant="warning">Follow up</Badge>
            <Badge variant="destructive">Delinquent</Badge>
            <Badge variant="outline">Absentee</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Pipeline
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-foreground)]">
                24
              </p>
            </div>
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Equity book
              </p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-success)]">
                $2.4M
              </p>
            </div>
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Opportunity
              </p>
              <p className="mt-1 text-2xl font-bold text-[color-mix(in_srgb,var(--color-primary)_55%,white)]">
                78 avg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
