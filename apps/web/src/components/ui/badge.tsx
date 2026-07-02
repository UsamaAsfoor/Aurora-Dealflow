import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "cyan";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        variant === "default" &&
          "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
        variant === "cyan" &&
          "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
        variant === "success" &&
          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        variant === "warning" &&
          "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        variant === "destructive" &&
          "bg-red-50 text-red-700 ring-1 ring-red-200",
        variant === "outline" &&
          "border border-slate-200 bg-white text-slate-600",
        className,
      )}
      {...props}
    />
  );
}
