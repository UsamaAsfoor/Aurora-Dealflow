import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--aurora-input)] px-3.5 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--aurora-placeholder)] outline-none transition-all focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20",
        className,
      )}
      {...props}
    />
  );
}
