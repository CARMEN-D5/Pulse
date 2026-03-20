import { calculateBalanceScore } from "../engine/balanceScore";

describe("calculateBalanceScore", () => {
  it("gives high score for balanced high domains", () => {
    const result = calculateBalanceScore({
      spirituality: 80, health: 80, financial: 80, social: 80, productivity: 80,
    });
    expect(result.balanceScore).toBe(80);
    expect(result.balanceFactor).toBe(1.0);
    expect(result.wellnessLevel).toBe(80);
  });

  it("penalises unbalanced high domains", () => {
    const result = calculateBalanceScore({
      spirituality: 90, health: 10, financial: 90, social: 10, productivity: 50,
    });
    expect(result.balanceScore).toBeLessThan(50);
    expect(result.balanceFactor).toBeLessThan(0.85);
  });

  it("'good & balanced' beats 'high but unbalanced'", () => {
    const balanced = calculateBalanceScore({
      spirituality: 65, health: 55, financial: 70, social: 60, productivity: 60,
    });
    const unbalanced = calculateBalanceScore({
      spirituality: 90, health: 10, financial: 90, social: 10, productivity: 50,
    });
    expect(balanced.balanceScore).toBeGreaterThan(unbalanced.balanceScore);
  });

  it("low but balanced is honest", () => {
    const result = calculateBalanceScore({
      spirituality: 30, health: 35, financial: 30, social: 35, productivity: 30,
    });
    expect(result.balanceScore).toBeGreaterThan(30);
    expect(result.balanceScore).toBeLessThan(35);
    expect(result.balanceFactor).toBeGreaterThan(0.97);
  });

  it("neglecting one domain creates noticeable drop", () => {
    const allGood = calculateBalanceScore({
      spirituality: 70, health: 70, financial: 70, social: 70, productivity: 70,
    });
    const oneNeglected = calculateBalanceScore({
      spirituality: 70, health: 70, financial: 70, social: 70, productivity: 15,
    });
    expect(allGood.balanceScore - oneNeglected.balanceScore).toBeGreaterThan(5);
  });

  it("clamps final score between 0 and 100", () => {
    const result = calculateBalanceScore({
      spirituality: 0, health: 0, financial: 0, social: 0, productivity: 0,
    });
    expect(result.balanceScore).toBe(0);
  });
});
