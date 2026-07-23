"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
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

  useEffect(() => {
    setQuery(locationQueryFromState(state));
  }, [state.areaMode, state.zip, state.city, state.county, state.state, state.intent, state.intentFields.address]);

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
      <div className="ps-location-bar flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/90">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) {
              if (e.key === "Enter" && suggestions[0]) {
                e.preventDefault();
                commit(suggestions[0]);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = suggestions[activeIndex] ?? suggestions[0];
              if (pick) commit(pick);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="County, city, ZIP, or address…"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {formatAreaHint(state) && (
          <span className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">
            {formatAreaHint(state)}
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="ps-suggest-panel absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl bg-white py-1 shadow-xl shadow-slate-900/15 ring-1 ring-slate-200"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                  index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(suggestion)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {suggestion.label}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {suggestion.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatAreaHint(state: SearchWorkspaceState): string | null {
  if (state.areaMode === "zip" && state.zip.length >= 5) return "ZIP";
  if (state.areaMode === "city" && state.city && state.state) return "City";
  if (state.areaMode === "county" && state.county && state.state) return "County";
  return null;
}
