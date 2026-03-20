/**
 * Balance Score tests — Geometric Mean
 */
import { calculateBalanceScore } from "../engine/balanceScore";
import { DomainScores } from "../types/scoring.types";

function makeScores(
  sp: number, he: number, fi: number, so: number, pr: number
): DomainScores {
  return {
    spirituality: sp,
    health: he,
    financial: fi,
    social: so,
    productivity: pr,
  };
}

describe("calculateBalanceScore (geometric mean)", () => {
  it("all equal domains → score equals that value", () => {
    const result = calculateBalanceScore(makeScores(60, 60, 60, 60, 60));
    expect(result.balanceScore).toBe(60);
  });

  it("one neglected domain → score drops significantly", () => {
    // [80, 80, 80, 80, 20] → geometric mean ≈ 60.6
    const result = calculateBalanceScore(makeScores(80, 80, 80, 80, 20));
    expect(result.balanceScore).toBeLessThan(65);
    expect(result.balanceScore).toBeGreaterThan(55);
  });

  it("balanced beats unbalanced even with same arithmetic mean", () => {
    // Both average to 60 arithmetically
    const balanced = calculateBalanceScore(makeScores(60, 60, 60, 60, 60));
    const unbalanced = calculateBalanceScore(makeScores(100, 100, 20, 20, 60));
    expect(balanced.balanceScore).toBeGreaterThan(unbalanced.balanceScore);
  });

  it("all high domains → high score", () => {
    const result = calculateBalanceScore(makeScores(85, 90, 80, 88, 82));
    expect(result.balanceScore).toBeGreaterThanOrEqual(84);
  });

  it("all low domains → low score", () => {
    const result = calculateBalanceScore(makeScores(20, 15, 25, 18, 22));
    expect(result.balanceScore).toBeLessThanOrEqual(25);
  });

  it("zero domain uses floor (no zero-collapse)", () => {
    // Without floor: product = 0, geometric mean = 0
    // With floor of 1: (80*80*80*80*1)^(1/5) ≈ 37
    const result = calculateBalanceScore(makeScores(80, 80, 80, 80, 0));
    expect(result.balanceScore).toBeGreaterThan(0);
    expect(result.balanceScore).toBeGreaterThanOrEqual(30);
  });

  it("score is always clamped between 0 and 100", () => {
    const low = calculateBalanceScore(makeScores(0, 0, 0, 0, 0));
    const high = calculateBalanceScore(makeScores(100, 100, 100, 100, 100));
    expect(low.balanceScore).toBeGreaterThanOrEqual(0);
    expect(low.balanceScore).toBeLessThanOrEqual(100);
    expect(high.balanceScore).toBe(100);
  });

  it("includes imbalanceSD in result", () => {
    const result = calculateBalanceScore(makeScores(80, 80, 80, 80, 20));
    expect(result.imbalanceSD).toBeGreaterThan(0);

    const balanced = calculateBalanceScore(makeScores(60, 60, 60, 60, 60));
    expect(balanced.imbalanceSD).toBe(0);
  });
});
