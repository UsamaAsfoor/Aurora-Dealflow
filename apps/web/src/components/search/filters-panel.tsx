"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { SearchMode } from "@aurora/core";
import {
  DISTRESS_INTENTS,
  getIntentDefinition,
  isSearchReady,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FiltersPanelProps {
  open: boolean;
  onClose: () => void;
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
  onViewProperties: () => void;
  resultCount?: number;
  isLoading?: boolean;
}

type CategoryKey = "lead" | "owner" | "value" | "distress" | "location";

const CATEGORIES: Array<{ key: CategoryKey; label: string }> = [
  { key: "lead", label: "Lead Lists" },
  { key: "owner", label: "Owner & Occupancy" },
  { key: "value", label: "Value & Equity" },
  { key: "distress", label: "Distress & MLS" },
  { key: "location", label: "Location extras" },
];

export function FiltersPanel({
  open,
  onClose,
  state,
  onChange,
  onViewProperties,
  resultCount,
  isLoading,
}: FiltersPanelProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<CategoryKey, boolean>>({
    lead: true,
    owner: true,
    value: false,
    distress: false,
    location: false,
  });

  const ready = isSearchReady(state);
  const intentDef = getIntentDefinition(state.intent);

  const visibleIntents = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return DISTRESS_INTENTS;
    return DISTRESS_INTENTS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.fields.some((f) => f.label.toLowerCase().includes(q)),
    );
  }, [filterQuery]);

  if (!open) return null;

  return (
    <div className="ps-filters-overlay fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        aria-label="Close filters"
        onClick={onClose}
      />
      <aside className="ps-filters-panel relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl shadow-slate-900/20">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Search filters
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Refine your lead list
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!ready || isLoading}
              onClick={() => {
                onViewProperties();
                onClose();
              }}
            >
              {isLoading
                ? "Searching…"
                : resultCount != null
                  ? `View ${resultCount}`
                  : "View"}
            </Button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Find a filter…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          {!ready && (
            <p className="mt-2 text-xs text-amber-700">
              Select a location (ZIP works best, e.g. 62704) before viewing properties.
            </p>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {CATEGORIES.map((category) => {
            if (filterQuery && category.key !== "lead") {
              // When searching filters, still show matching lead lists; skip empty categories later
            }
            return (
              <section
                key={category.key}
                className="overflow-hidden rounded-xl ring-1 ring-slate-200"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left"
                  onClick={() =>
                    setOpenCategories((prev) => ({
                      ...prev,
                      [category.key]: !prev[category.key],
                    }))
                  }
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {category.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-500 transition-transform",
                      openCategories[category.key] && "rotate-180",
                    )}
                  />
                </button>

                {openCategories[category.key] && (
                  <div className="space-y-3 px-4 py-3">
                    {category.key === "lead" && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {visibleIntents.map((intent) => {
                          const Icon = intent.icon;
                          const active = state.intent === intent.key;
                          return (
                            <button
                              key={intent.key}
                              type="button"
                              onClick={() =>
                                onChange({
                                  intent: intent.key as SearchMode,
                                  intentFields: {},
                                })
                              }
                              className={cn(
                                "ps-lead-list-card flex flex-col items-start gap-2 rounded-xl px-3 py-3 text-left transition-all",
                                active
                                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-blue-300",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  active ? "text-blue-100" : "text-blue-600",
                                )}
                              />
                              <span className="text-xs font-semibold leading-tight">
                                {intent.label}
                              </span>
                              {intent.stub && (
                                <span
                                  className={cn(
                                    "text-[10px] uppercase tracking-wide",
                                    active ? "text-blue-100" : "text-slate-400",
                                  )}
                                >
                                  Demo
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {category.key === "owner" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Min years owned"
                          value={state.intentFields.minOwnershipYears ?? ""}
                          onChange={(value) =>
                            onChange({
                              intentFields: {
                                ...state.intentFields,
                                minOwnershipYears: value,
                              },
                            })
                          }
                          placeholder="10"
                        />
                        <div>
                          <Label>Out-of-state only</Label>
                          <select
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={state.intentFields.outOfStateOnly ?? ""}
                            onChange={(e) =>
                              onChange({
                                intentFields: {
                                  ...state.intentFields,
                                  outOfStateOnly: e.target.value,
                                },
                              })
                            }
                          >
                            <option value="">Any</option>
                            <option value="yes">Out-of-state only</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {category.key === "value" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Min price"
                          value={state.minPrice}
                          onChange={(value) => onChange({ minPrice: value })}
                          placeholder="100000"
                        />
                        <Field
                          label="Max price"
                          value={state.maxPrice}
                          onChange={(value) => onChange({ maxPrice: value })}
                          placeholder="500000"
                        />
                        <Field
                          label="Min equity %"
                          value={state.minEquityPercent}
                          onChange={(value) =>
                            onChange({ minEquityPercent: value })
                          }
                          placeholder="40"
                        />
                        <Field
                          label="Min score"
                          value={state.minScore}
                          onChange={(value) => onChange({ minScore: value })}
                          placeholder="70"
                        />
                        <div className="sm:col-span-2">
                          <Label>Sort by</Label>
                          <select
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={state.sortBy}
                            onChange={(e) =>
                              onChange({
                                sortBy: e.target.value as SearchWorkspaceState["sortBy"],
                              })
                            }
                          >
                            <option value="score">Score</option>
                            <option value="price">Price</option>
                            <option value="equity">Equity</option>
                            <option value="distance">Distance</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {category.key === "distress" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {intentDef.fields
                          .filter((field) =>
                            [
                              "minVacancyMonths",
                              "minDaysExpired",
                              "mlsNumber",
                              "listingStatus",
                              "emlsStatus",
                              "minDelinquentAmount",
                              "minDelinquentYears",
                              "foreclosureStage",
                            ].includes(field.key),
                          )
                          .map((field) =>
                            field.type === "select" ? (
                              <div key={field.key}>
                                <Label>{field.label}</Label>
                                <select
                                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                  value={state.intentFields[field.key] ?? ""}
                                  onChange={(e) =>
                                    onChange({
                                      intentFields: {
                                        ...state.intentFields,
                                        [field.key]: e.target.value,
                                      },
                                    })
                                  }
                                >
                                  {(field.options ?? []).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <Field
                                key={field.key}
                                label={field.label}
                                value={state.intentFields[field.key] ?? ""}
                                onChange={(value) =>
                                  onChange({
                                    intentFields: {
                                      ...state.intentFields,
                                      [field.key]: value,
                                    },
                                  })
                                }
                                placeholder={field.placeholder}
                              />
                            ),
                          )}
                        {intentDef.fields.filter((f) =>
                          [
                            "minVacancyMonths",
                            "minDaysExpired",
                            "mlsNumber",
                            "listingStatus",
                            "emlsStatus",
                            "minDelinquentAmount",
                            "minDelinquentYears",
                            "foreclosureStage",
                          ].includes(f.key),
                        ).length === 0 && (
                          <p className="text-xs text-slate-500 sm:col-span-2">
                            Choose a Lead List above to unlock distress-specific
                            filters.
                          </p>
                        )}
                      </div>
                    )}

                    {category.key === "location" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Field
                            label="Address / center point"
                            value={state.intentFields.address ?? ""}
                            onChange={(value) =>
                              onChange({
                                intentFields: {
                                  ...state.intentFields,
                                  address: value,
                                },
                              })
                            }
                            placeholder="1120 W Edwards St"
                          />
                        </div>
                        <Field
                          label="Radius (miles)"
                          value={state.intentFields.radiusMiles ?? ""}
                          onChange={(value) =>
                            onChange({
                              intentFields: {
                                ...state.intentFields,
                                radiusMiles: value,
                              },
                            })
                          }
                          placeholder="2"
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          <Button
            className="w-full"
            size="lg"
            disabled={!ready || isLoading}
            onClick={() => {
              onViewProperties();
              onClose();
            }}
          >
            {isLoading
              ? "Searching…"
              : resultCount != null
                ? `View ${resultCount} Properties`
                : "View Properties"}
          </Button>
        </footer>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
