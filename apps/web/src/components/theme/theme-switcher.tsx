"use client";

import { useTheme, type ThemeMeta } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ThemeDot({
  item,
  active,
  onSelect,
  size = "md",
}: {
  item: ThemeMeta;
  active: boolean;
  onSelect: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      title={`${item.label}: ${item.description}`}
      onClick={onSelect}
      className={cn(
        "rounded-full transition ring-offset-2 ring-offset-[var(--color-background)]",
        size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
        active
          ? "ring-2 ring-[var(--color-foreground)]"
          : "opacity-55 hover:opacity-100",
      )}
      style={{ backgroundColor: item.swatch }}
    />
  );
}

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme, darkThemes, lightThemes } = useTheme();

  if (compact) {
    return (
      <div className="flex max-h-48 flex-col items-center gap-1.5 overflow-y-auto py-1">
        {[...darkThemes, ...lightThemes].map((item) => (
          <ThemeDot
            key={item.id}
            item={item}
            size="sm"
            active={theme === item.id}
            onSelect={() => setTheme(item.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-2">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
        Appearance
      </p>
      <div className="max-h-64 space-y-3 overflow-y-auto pr-0.5">
        <div>
          <p className="mb-1 px-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
            Dark
          </p>
          <div className="space-y-0.5">
            {darkThemes.map((item) => (
              <ThemeRow
                key={item.id}
                item={item}
                active={theme === item.id}
                onSelect={() => setTheme(item.id)}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 px-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
            Light
          </p>
          <div className="space-y-0.5">
            {lightThemes.map((item) => (
              <ThemeRow
                key={item.id}
                item={item}
                active={theme === item.id}
                onSelect={() => setTheme(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeRow({
  item,
  active,
  onSelect,
}: {
  item: ThemeMeta;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition",
        active
          ? "bg-[var(--color-accent)] text-[var(--color-foreground)]"
          : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/60 hover:text-[var(--color-foreground)]",
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: item.swatch }}
      />
      <span className="min-w-0">
        <span className="block text-xs font-medium">{item.label}</span>
        <span className="block truncate text-[10px] opacity-70">
          {item.description}
        </span>
      </span>
    </button>
  );
}
