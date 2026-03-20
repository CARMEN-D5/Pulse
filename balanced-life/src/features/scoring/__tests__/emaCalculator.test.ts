import { emaStep, quizWeightAfterWeeks } from "../engine/emaCalculator";

describe("emaStep", () => {
  it("calculates first week after quiz correctly", () => {
    // Maria: quiz = 25, weekly input = 75, alpha = 0.3
    const result = emaStep(75, 25, 0.3);
    expect(result).toBe(40);
  });

  it("second week continues to climb", () => {
    const week1 = emaStep(75, 25, 0.3); // 40
    const week2 = emaStep(75, week1, 0.3); // 50.5
    expect(week2).toBeCloseTo(50.5, 0);
  });

  it("bad week causes moderate dip, not crash", () => {
    // John: steady at 63, then bad week (20)
    const result = emaStep(20, 63, 0.3);
    expect(result).toBeCloseTo(50.1, 0);
    expect(result).toBeGreaterThan(40); // not catastrophic
  });

  it("recovers quickly after bad week", () => {
    const dip = emaStep(20, 63, 0.3); // ~50.1
    const recovery = emaStep(70, dip, 0.3); // ~56
    expect(recovery).toBeGreaterThan(55);
  });
});

describe("quizWeightAfterWeeks", () => {
  it("quiz has 100% weight at week 0", () => {
    expect(quizWeightAfterWeeks(0)).toBe(1.0);
  });

  it("quiz has ~34% weight after 3 weeks", () => {
    expect(quizWeightAfterWeeks(3)).toBeCloseTo(0.343, 2);
  });

  it("quiz has ~17% weight after 5 weeks", () => {
    expect(quizWeightAfterWeeks(5)).toBeCloseTo(0.168, 2);
  });

  it("quiz has <6% weight after 8 weeks", () => {
    expect(quizWeightAfterWeeks(8)).toBeLessThan(0.06);
  });
});
