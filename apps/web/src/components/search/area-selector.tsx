"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AreaMode, SearchWorkspaceState } from "@/components/search/search-intents";

interface AreaSelectorProps {
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
}

export function AreaSelector({ state, onChange }: AreaSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Step 1 · Where
          </p>
          <p className="mt-1 text-sm text-slate-600">
            ZIP works best (try 62704). County needs a 2-letter state.
          </p>
        </div>
      </div>

      <Tabs.Root
        value={state.areaMode}
        onValueChange={(value) =>
          onChange({ areaMode: value as AreaMode })
        }
      >
        <Tabs.List className="search-segmented inline-flex rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200/80">
          {(
            [
              ["county", "County"],
              ["zip", "ZIP"],
              ["city", "City"],
            ] as const
          ).map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                "search-segment-trigger rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all",
                "data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm",
              )}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px]">
          {state.areaMode === "county" && (
            <>
              <div>
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  placeholder="Sangamon"
                  value={state.county}
                  onChange={(e) => onChange({ county: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state-county">State</Label>
                <Input
                  id="state-county"
                  placeholder="IL"
                  maxLength={2}
                  value={state.state}
                  onChange={(e) =>
                    onChange({ state: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </>
          )}

          {state.areaMode === "zip" && (
            <div className="sm:col-span-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="62704"
                value={state.zip}
                onChange={(e) => onChange({ zip: e.target.value })}
              />
            </div>
          )}

          {state.areaMode === "city" && (
            <>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Springfield"
                  value={state.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state-city">State</Label>
                <Input
                  id="state-city"
                  placeholder="IL"
                  maxLength={2}
                  value={state.state}
                  onChange={(e) =>
                    onChange({ state: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
}
