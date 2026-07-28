import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-[var(--color-accent)] ring-1 ring-[var(--color-border)]",
        className,
      )}
      {...props}
    />
  );
}
