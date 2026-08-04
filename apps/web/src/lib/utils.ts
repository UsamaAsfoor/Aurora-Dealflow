import { clsx, type ClassValue } from "clsx";
import type { CSSProperties } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stage colors are often mid/dark blues — lighten text for dark UI contrast. */
export function stageBadgeStyle(
  color: string | null | undefined,
): CSSProperties | undefined {
  if (!color) return undefined;
  return {
    backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)`,
    color: `color-mix(in srgb, ${color} 55%, white)`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
  };
}
