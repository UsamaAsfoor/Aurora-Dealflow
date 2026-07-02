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
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold ring-2",
        size === "sm" && "h-9 w-9 text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-16 w-16 text-xl",
        band === "high" &&
          "bg-emerald-50 text-emerald-700 ring-emerald-200",
        band === "medium" &&
          "bg-amber-50 text-amber-700 ring-amber-200",
        band === "low" &&
          "bg-slate-100 text-slate-500 ring-slate-200",
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
        band === "high" && "text-emerald-700",
        band === "medium" && "text-amber-700",
        band === "low" && "text-slate-500",
      )}
    >
      {labels[band]}
    </span>
  );
}
