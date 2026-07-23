"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getIntentDefinition,
  type SearchWorkspaceState,
} from "@/components/search/search-intents";

interface DynamicFilterFieldsProps {
  state: SearchWorkspaceState;
  onChange: (partial: Partial<SearchWorkspaceState>) => void;
}

export function DynamicFilterFields({
  state,
  onChange,
}: DynamicFilterFieldsProps) {
  const intent = getIntentDefinition(state.intent);
  const fields = intent.fields;

  const updateField = (key: string, value: string) => {
    onChange({
      intentFields: {
        ...state.intentFields,
        [key]: value,
      },
    });
  };

  return (
    <div
      className={cn(
        "search-dynamic-panel overflow-hidden transition-all duration-300 ease-out",
        fields.length > 0 ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0",
      )}
    >
      {fields.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 ring-1 ring-slate-100">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Step 3 · Refine {intent.label}
            </p>
            <p className="mt-1 text-sm text-slate-600">{intent.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key}>
                <Label htmlFor={field.key} className="flex items-center gap-2">
                  {field.label}
                  {field.stub && (
                    <span className="text-[10px] font-medium uppercase text-amber-600">
                      Demo
                    </span>
                  )}
                </Label>
                {field.type === "select" ? (
                  <select
                    id={field.key}
                    className="mt-1.5 flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={state.intentFields[field.key] ?? ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={state.intentFields[field.key] ?? ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="mt-1.5"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
