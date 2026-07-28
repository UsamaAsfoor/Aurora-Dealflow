"use client";

import { useTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SWATCH: Record<ThemeId, string> = {
  studio: "bg-[#7c9cff]",
  command: "bg-[#d4a017]",
  signal: "bg-[#2dd4bf]",
};

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme, themes } = useTheme();

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.label}: ${item.description}`}
            onClick={() => setTheme(item.id)}
            className={cn(
              "h-3.5 w-3.5 rounded-full transition ring-offset-2 ring-offset-[var(--color-background)]",
              SWATCH[item.id],
              theme === item.id
                ? "ring-2 ring-[var(--color-foreground)]"
                : "opacity-50 hover:opacity-100",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-2">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
        Theme
      </p>
      <div className="space-y-0.5">
        {themes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTheme(item.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
              theme === item.id
                ? "bg-[var(--color-accent)] text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/60 hover:text-[var(--color-foreground)]",
            )}
          >
            <span
              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SWATCH[item.id])}
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium">{item.label}</span>
              <span className="block truncate text-[10px] opacity-70">
                {item.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
