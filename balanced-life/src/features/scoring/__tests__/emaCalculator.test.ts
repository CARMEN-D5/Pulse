/**
 * Daily EMA Calculator tests
 */
import { dailyEmaStep, buildDailySignal } from "../engine/emaCalculator";

describe("dailyEmaStep", () => {
  it("moves score toward today's signal", () => {
    // current = 62, today = 75, alpha = 0.12
    // raw = 0.12*75 + 0.88*62 = 9 + 54.56 = 63.56
    const result = dailyEmaStep(75, 62, 0.12);
    expect(result).toBeCloseTo(63.6, 1);
    expect(result).toBeGreaterThan(62);
  });

  it("bad day causes small drop, not crash", () => {
    // current = 70, today = 0, alpha = 0.12
    // raw = 0.12*0 + 0.88*70 = 61.6
    // movement = -8.4 → capped to -3
    const result = dailyEmaStep(0, 70, 0.12);
    expect(result).toBe(67);
    expect(result).toBeGreaterThan(60); // capped, not a crash
  });

  it("caps upward movement at +3 per day", () => {
    // current = 30, today = 100, alpha = 0.12
    // raw = 0.12*100 + 0.88*30 = 12 + 26.4 = 38.4
    // movement = +8.4 → capped to +3
    const result = dailyEmaStep(100, 30, 0.12);
    expect(result).toBe(33);
  });

  it("caps downward movement at -3 per day", () => {
    // current = 80, today = 0, alpha = 0.12
    // movement = -9.6 → capped to -3
    const result = dailyEmaStep(0, 80, 0.12);
    expect(result).toBe(77);
  });

  it("small movement within cap is not altered", () => {
    // current = 62, today = 75, alpha = 0.12
    // movement = +1.56 → within ±3, no cap
    const result = dailyEmaStep(75, 62, 0.12);
    expect(result).toBeCloseTo(63.6, 1);
  });

  it("no change when signal equals previous score", () => {
    const result = dailyEmaStep(50, 50, 0.12);
    expect(result).toBe(50);
  });

  it("clamps result to [0, 100]", () => {
    // Edge case: score can't go below 0
    const low = dailyEmaStep(0, 1, 0.12);
    expect(low).toBeGreaterThanOrEqual(0);

    // Edge case: score can't exceed 100
    const high = dailyEmaStep(100, 99, 0.12);
    expect(high).toBeLessThanOrEqual(100);
  });
});

describe("buildDailySignal", () => {
  it("returns check-in signal when no actions", () => {
    expect(buildDailySignal(75)).toBe(75);
  });

  it("blends check-in 70% and actions 30%", () => {
    const result = buildDailySignal(80, 60);
    // 0.7 * 80 + 0.3 * 60 = 56 + 18 = 74
    expect(result).toBe(74);
  });

  it("check-in weighs more than actions", () => {
    const highCheckIn = buildDailySignal(100, 0);
    const highAction = buildDailySignal(0, 100);
    expect(highCheckIn).toBeGreaterThan(highAction);
  });
});
