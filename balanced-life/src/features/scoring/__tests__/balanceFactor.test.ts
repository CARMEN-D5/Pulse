/**
 * Standard Deviation tests (imbalance indicator)
 */
import { standardDeviation } from "../engine/balanceFactor";

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

  it("calculates correctly for slight imbalance", () => {
    const sd = standardDeviation([65, 55, 70, 60, 60]);
    // mean = 62, small SD
    expect(sd).toBeLessThan(10);
    expect(sd).toBeGreaterThan(0);
  });

  it("high SD for extremely unbalanced scores", () => {
    const sd = standardDeviation([100, 0, 0, 0, 0]);
    expect(sd).toBeGreaterThan(35);
  });
});
