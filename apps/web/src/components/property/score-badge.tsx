import { scoreBand } from "@aurora/core";
import { cn } from "@/lib/utils";

export function ScoreBadge({
  score,
  className,
  size = "md",
}: {
  score: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const band = scoreBand(score);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-1",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
        band === "high" &&
          "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)] ring-[color-mix(in_srgb,var(--color-success)_35%,transparent)]",
        band === "medium" &&
          "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)] ring-[color-mix(in_srgb,var(--color-warning)_35%,transparent)]",
        band === "low" &&
          "bg-[var(--color-accent)] text-[var(--color-muted-foreground)] ring-[var(--color-border)]",
        className,
      )}
      title={`Opportunity score: ${score}/100`}
    >
      {score}
    </div>
  );
}

export function ScoreBandLabel({ score }: { score: number }) {
  const band = scoreBand(score);
  const labels = {
    high: "High Opportunity",
    medium: "Moderate Opportunity",
    low: "Low Opportunity",
  };

  return (
    <span
      className={cn(
        "text-sm font-semibold",
        band === "high" && "text-[var(--color-success)]",
        band === "medium" && "text-[var(--color-warning)]",
        band === "low" && "text-[var(--color-muted-foreground)]",
      )}
    >
      {labels[band]}
    </span>
  );
}
