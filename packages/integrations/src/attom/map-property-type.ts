import type { PropertyType } from "@aurora/core";

export function mapPropertyType(raw: string | undefined | null): PropertyType {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("single") || value.includes("sfr") || value === "10") {
    return "single_family";
  }
  if (
    value.includes("multi") ||
    value.includes("duplex") ||
    value.includes("triplex") ||
    value.includes("quad") ||
    value === "21" ||
    value === "22"
  ) {
    return "multi_family";
  }
  if (value.includes("condo") || value === "11") return "condo";
  if (value.includes("town")) return "townhouse";
  if (value.includes("land") || value.includes("vacant") || value === "80") {
    return "land";
  }
  if (value.includes("commercial") || value === "20") return "commercial";
  return "other";
}
