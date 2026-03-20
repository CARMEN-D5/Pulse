import { calculateBalanceFactor, standardDeviation } from "../engine/balanceFactor";

describe("standardDeviation", () => {
  it("returns 0 for identical values", () => {
    expect(standardDeviation([60, 60, 60, 60, 60])).toBe(0);
  });

  it("calculates correctly for varied values", () => {
    const sd = standardDeviation([90, 10, 90, 10, 50]);
    // Population SD: mean=50, squared diffs=[1600,1600,1600,1600,0], variance=1280, SD≈35.78
    expect(sd).toBeCloseTo(35.78, 0);
  });

  it("returns 0 for empty array", () => {
    expect(standardDeviation([])).toBe(0);
  });
});

describe("calculateBalanceFactor", () => {
  it("returns 1.0 for perfectly balanced scores", () => {
    expect(calculateBalanceFactor([60, 60, 60, 60, 60])).toBe(1.0);
  });

  it("returns 1.0 for all zeros", () => {
    expect(calculateBalanceFactor([0, 0, 0, 0, 0])).toBe(1.0);
  });

  it("penalises unbalanced scores", () => {
    const factor = calculateBalanceFactor([90, 10, 90, 10, 50]);
    expect(factor).toBeGreaterThan(0.5);
    expect(factor).toBeLessThan(0.9);
  });

  it("gives small penalty for slightly unbalanced scores", () => {
    const factor = calculateBalanceFactor([65, 55, 70, 60, 60]);
    expect(factor).toBeGreaterThan(0.95);
  });

  it("never goes below 0.5", () => {
    const factor = calculateBalanceFactor([100, 0, 0, 0, 0]);
    expect(factor).toBeGreaterThanOrEqual(0.5);
  });
});
