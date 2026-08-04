import type {
  CompsAnalysis,
  PropertyComp,
  SoldWithinMonths,
} from "./types.js";

export function computeCompsAnalysis(
  comps: PropertyComp[],
  options: {
    radiusMiles: number;
    soldWithinMonths: SoldWithinMonths;
    subjectSqft?: number | null;
  },
): CompsAnalysis {
  const priced = comps.filter(
    (comp): comp is PropertyComp & { salePrice: number } =>
      comp.salePrice != null && comp.salePrice > 0,
  );

  const averageSalePrice =
    priced.length > 0
      ? Math.round(
          priced.reduce((sum, comp) => sum + comp.salePrice, 0) / priced.length,
        )
      : null;

  const withSqft = priced.filter(
    (comp): comp is PropertyComp & { salePrice: number; sqft: number } =>
      comp.sqft != null && comp.sqft > 0,
  );

  const averagePricePerSqft =
    withSqft.length > 0
      ? Math.round(
          (withSqft.reduce(
            (sum, comp) => sum + comp.salePrice / comp.sqft,
            0,
          ) /
            withSqft.length) *
            100,
        ) / 100
      : null;

  let estimatedArv = averageSalePrice;
  const subjectSqft = options.subjectSqft;
  if (
    averagePricePerSqft != null &&
    subjectSqft != null &&
    subjectSqft > 0
  ) {
    estimatedArv = Math.round(averagePricePerSqft * subjectSqft);
  }

  return {
    comps,
    averageSalePrice,
    averagePricePerSqft,
    estimatedArv,
    radiusMiles: options.radiusMiles,
    soldWithinMonths: options.soldWithinMonths,
  };
}

export function soldWindowCutoffIso(months: SoldWithinMonths, now = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff.toISOString().slice(0, 10);
}

export function formatAttomDate(isoDate: string): string {
  // ATTOM docs use YYYY/MM/DD for sale date ranges
  return isoDate.replaceAll("-", "/");
}
