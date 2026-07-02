import type {
  OpportunityScoreResult,
  PropertySignals,
  SignalScore,
} from "../types.js";

export const SIGNAL_WEIGHTS = {
  equityPercent: 0.25,
  ownershipYears: 0.15,
  isAbsentee: 0.15,
  isVacant: 0.1,
  isPreForeclosure: 0.15,
  isTaxDelinquent: 0.1,
  recentSaleDiscountPercent: 0.1,
} as const;

export const SIGNAL_LABELS: Record<keyof typeof SIGNAL_WEIGHTS, string> = {
  equityPercent: "Equity %",
  ownershipYears: "Ownership Length",
  isAbsentee: "Absentee Owner",
  isVacant: "Vacancy",
  isPreForeclosure: "Pre-Foreclosure",
  isTaxDelinquent: "Tax Delinquency",
  recentSaleDiscountPercent: "Recent Sale Discount",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeEquityPercent(value: number | null): number {
  if (value == null) return 0;
  return clamp(value / 100, 0, 1);
}

function normalizeOwnershipYears(value: number | null): number {
  if (value == null) return 0;
  return clamp(value / 20, 0, 1);
}

function normalizeBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function normalizeSaleDiscount(value: number | null): number {
  if (value == null || value <= 0) return 0;
  return clamp(value / 30, 0, 1);
}

export function computeOpportunityScore(
  signals: PropertySignals,
): OpportunityScoreResult {
  const rawScores: Record<keyof typeof SIGNAL_WEIGHTS, number> = {
    equityPercent: normalizeEquityPercent(signals.equityPercent),
    ownershipYears: normalizeOwnershipYears(signals.ownershipYears),
    isAbsentee: normalizeBoolean(signals.isAbsentee),
    isVacant: normalizeBoolean(signals.isVacant),
    isPreForeclosure: normalizeBoolean(signals.isPreForeclosure),
    isTaxDelinquent: normalizeBoolean(signals.isTaxDelinquent),
    recentSaleDiscountPercent: normalizeSaleDiscount(
      signals.recentSaleDiscountPercent,
    ),
  };

  const breakdown: SignalScore[] = (
    Object.keys(SIGNAL_WEIGHTS) as Array<keyof typeof SIGNAL_WEIGHTS>
  ).map((signal) => {
    const weight = SIGNAL_WEIGHTS[signal];
    const normalizedScore = rawScores[signal];
    const contribution = normalizedScore * weight * 100;

    return {
      signal,
      label: SIGNAL_LABELS[signal],
      weight,
      rawValue: signals[signal as keyof PropertySignals] as
        | number
        | boolean
        | null,
      normalizedScore,
      contribution,
    };
  });

  const score = clamp(
    Math.round(breakdown.reduce((sum, item) => sum + item.contribution, 0)),
    1,
    100,
  );

  return { score, breakdown };
}

export function computeSearchResultScore(
  result: Pick<
    PropertySignals,
    | "equityPercent"
    | "ownershipYears"
    | "isAbsentee"
    | "isVacant"
    | "isPreForeclosure"
    | "isTaxDelinquent"
  > & { attomId: string },
): number {
  return computeOpportunityScore({
    ...result,
    recentSaleDiscountPercent: null,
  }).score;
}
