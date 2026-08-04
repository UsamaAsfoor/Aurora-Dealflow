import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?:
    | "default"
    | "success"
    | "warning"
    | "destructive"
    | "outline"
    | "cyan";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        variant === "default" &&
          "bg-[var(--color-accent)] text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]",
        variant === "cyan" &&
          "bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[color-mix(in_srgb,var(--color-primary)_55%,white)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_35%,transparent)]",
        variant === "success" &&
          "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)] ring-1 ring-[color-mix(in_srgb,var(--color-success)_30%,transparent)]",
        variant === "warning" &&
          "bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-[var(--color-warning)] ring-1 ring-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]",
        variant === "destructive" &&
          "bg-[color-mix(in_srgb,var(--color-destructive)_15%,transparent)] text-[var(--color-destructive)] ring-1 ring-[color-mix(in_srgb,var(--color-destructive)_30%,transparent)]",
        variant === "outline" &&
          "border border-[var(--color-border)] bg-transparent text-[var(--color-muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
