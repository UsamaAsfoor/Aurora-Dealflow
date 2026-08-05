"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { looksLikeStreetAddress } from "@aurora/core";
import {
  detectSearchInput,
  getLocationSuggestions,
  locationQueryFromState,
  type LocationSuggestion,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";
import { cn } from "@/lib/utils";

interface LocationSearchBarProps {
  state: SearchWorkspaceState;
  onSelect: (suggestion: LocationSuggestion) => void;
  className?: string;
}

export function LocationSearchBar({
  state,
  onSelect,
  className,
}: LocationSearchBarProps) {
  const listId = useId();
  const [query, setQuery] = useState(() => locationQueryFromState(state));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = getLocationSuggestions(query);
  const detected = detectSearchInput(query);

  useEffect(() => {
    setQuery(locationQueryFromState(state));
  }, [
    state.areaMode,
    state.zip,
    state.city,
    state.county,
    state.state,
    state.intent,
    state.intentFields.address,
  ]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(suggestion: LocationSuggestion) {
    if (suggestion.description.includes("Add a state")) {
      setQuery(suggestion.label.replace(", ??", ", "));
      setOpen(true);
      return;
    }
    if (suggestion.label.endsWith("…")) {
      setQuery(suggestion.label.replace("…", ""));
      setOpen(true);
      return;
    }
    onSelect(suggestion);
    setQuery(suggestion.label);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={cn("relative min-w-0 flex-1", className)}>
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)]/95 px-3.5 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }

            if (e.key === "ArrowDown" && suggestions.length > 0) {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
              return;
            }
            if (e.key === "ArrowUp" && suggestions.length > 0) {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
              return;
            }

            if (e.key === "Enter") {
              e.preventDefault();
              const pick = suggestions[activeIndex] ?? suggestions[0];
              if (pick) {
                commit(pick);
                return;
              }
              // Commit raw full address even if suggestions list is empty
              const q = query.trim();
              if (looksLikeStreetAddress(q)) {
                commit({
                  id: `address-${q}`,
                  kind: "address",
                  label: q,
                  description: "Look up this exact property",
                  patch: {
                    areaMode: "zip",
                    zip: "",
                    city: "",
                    county: "",
                    state: "",
                    polygon: null,
                    intent: "specific_property",
                    intentFields: { address: q },
                  },
                });
              }
            }
          }}
          placeholder="ZIP code or full street address…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-foreground)] outline-none placeholder:text-[var(--aurora-placeholder)]"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        <span
          className={cn(
            "hidden shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium sm:inline",
            detected.kind === "zip" || detected.kind === "zip_partial"
              ? "bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)]"
              : detected.kind === "address"
                ? "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
          )}
        >
          {query.trim()
            ? detected.label
            : formatCommittedHint(state) ?? "ZIP / Address"}
        </span>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="ac-suggest-panel absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--aurora-surface)] py-1 shadow-2xl shadow-black/40"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors",
                  index === activeIndex
                    ? "bg-[var(--color-accent)]"
                    : "hover:bg-[var(--color-accent)]/70",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--color-foreground)]">
                    {suggestion.label}
                  </span>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    {suggestion.description}
                  </span>
                </span>
                <span className="ml-auto shrink-0 rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {suggestion.kind}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatCommittedHint(state: SearchWorkspaceState): string | null {
  if (state.intentFields.address?.trim()) return "Street address";
  if (state.areaMode === "zip" && state.zip.length >= 5) return "ZIP code";
  if (state.areaMode === "city" && state.city && state.state) return "City";
  if (state.areaMode === "county" && state.county && state.state)
    return "County";
  return null;
}
