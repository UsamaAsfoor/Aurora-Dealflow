import { describe, expect, it } from "vitest";
import { computeOpportunityScore } from "./computeScore.js";
import type { PropertySignals } from "../types.js";

const baseSignals: PropertySignals = {
  attomId: "test-1",
  equityPercent: null,
  ownershipYears: null,
  isAbsentee: false,
  isVacant: false,
  isPreForeclosure: false,
  isTaxDelinquent: false,
  recentSaleDiscountPercent: null,
};

describe("computeOpportunityScore", () => {
  it("scores high-equity absentee owner highly", () => {
    const result = computeOpportunityScore({
      ...baseSignals,
      equityPercent: 80,
      ownershipYears: 18,
      isAbsentee: true,
      isVacant: true,
      isPreForeclosure: true,
      isTaxDelinquent: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown).toHaveLength(7);
  });

  it("scores low-equity recent flip lower", () => {
    const result = computeOpportunityScore({
      ...baseSignals,
      equityPercent: 10,
      ownershipYears: 1,
      isAbsentee: false,
    });

    expect(result.score).toBeLessThan(40);
  });

  it("scores pre-foreclosure with tax delinquency higher than baseline", () => {
    const baseline = computeOpportunityScore(baseSignals);
    const distressed = computeOpportunityScore({
      ...baseSignals,
      isPreForeclosure: true,
      isTaxDelinquent: true,
    });

    expect(distressed.score).toBeGreaterThan(baseline.score);
  });

  it("returns score between 1 and 100", () => {
    const maxResult = computeOpportunityScore({
      attomId: "max",
      equityPercent: 100,
      ownershipYears: 30,
      isAbsentee: true,
      isVacant: true,
      isPreForeclosure: true,
      isTaxDelinquent: true,
      recentSaleDiscountPercent: 40,
    });

    expect(maxResult.score).toBeGreaterThanOrEqual(1);
    expect(maxResult.score).toBeLessThanOrEqual(100);
  });

  it("is deterministic for the same inputs", () => {
    const signals: PropertySignals = {
      attomId: "stable",
      equityPercent: 55,
      ownershipYears: 12,
      isAbsentee: true,
      isVacant: false,
      isPreForeclosure: false,
      isTaxDelinquent: true,
      recentSaleDiscountPercent: 15,
    };

    expect(computeOpportunityScore(signals)).toEqual(
      computeOpportunityScore(signals),
    );
  });
});
