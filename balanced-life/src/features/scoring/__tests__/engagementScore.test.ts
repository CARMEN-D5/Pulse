import {
  calcCheckInCompletion,
  calcActionCompletion,
  calcStreakStrength,
  calcFeatureParticipation,
  calculateWeeklyEngagement,
  getRewardTier,
  WeeklyEngagementInput,
} from "../engine/engagementScore";

describe("getRewardTier", () => {
  it("returns 'none' for score below 30", () => {
    expect(getRewardTier(0)).toBe("none");
    expect(getRewardTier(29)).toBe("none");
  });

  it("returns 'bronze' for score 30-59", () => {
    expect(getRewardTier(30)).toBe("bronze");
    expect(getRewardTier(59)).toBe("bronze");
  });

  it("returns 'silver' for score 60-84", () => {
    expect(getRewardTier(60)).toBe("silver");
    expect(getRewardTier(84)).toBe("silver");
  });

  it("returns 'gold' for score 85+", () => {
    expect(getRewardTier(85)).toBe("gold");
    expect(getRewardTier(100)).toBe("gold");
  });
});

describe("calcCheckInCompletion", () => {
  it("returns 0 when no check-ins", () => {
    expect(calcCheckInCompletion(0)).toBe(0);
  });

  it("returns 100 when checked in all 7 days", () => {
    expect(calcCheckInCompletion(7)).toBe(100);
  });

  it("returns ~43 for 3/7 days", () => {
    expect(calcCheckInCompletion(3)).toBe(43);
  });

  it("clamps above 7", () => {
    expect(calcCheckInCompletion(10)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(calcCheckInCompletion(-1)).toBe(0);
  });
});

describe("calcActionCompletion", () => {
  it("returns 0 when no missions assigned", () => {
    expect(calcActionCompletion(0, 0)).toBe(0);
  });

  it("returns 100 when all missions completed", () => {
    expect(calcActionCompletion(3, 3)).toBe(100);
  });

  it("returns 67 for 2/3 missions", () => {
    expect(calcActionCompletion(2, 3)).toBe(67);
  });

  it("clamps completed to total", () => {
    expect(calcActionCompletion(5, 3)).toBe(100);
  });
});

describe("calcStreakStrength", () => {
  it("returns 0 for zero streak", () => {
    expect(calcStreakStrength(0)).toBe(0);
  });

  it("returns positive value for streak of 1", () => {
    const result = calcStreakStrength(1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(30);
  });

  it("returns ~57 for streak of 7", () => {
    const result = calcStreakStrength(7);
    expect(result).toBeGreaterThan(50);
    expect(result).toBeLessThan(65);
  });

  it("returns 100 for streak of 30 (plateau)", () => {
    expect(calcStreakStrength(30)).toBe(100);
  });

  it("caps at 100 for very long streaks", () => {
    expect(calcStreakStrength(100)).toBe(100);
  });
});

describe("calcFeatureParticipation", () => {
  it("returns 0 when no features used", () => {
    expect(calcFeatureParticipation([])).toBe(0);
  });

  it("returns 13 for 1/8 features", () => {
    expect(calcFeatureParticipation(["checkIn"])).toBe(13);
  });

  it("returns 25 for 2/8 features", () => {
    expect(calcFeatureParticipation(["checkIn", "missions"])).toBe(25);
  });

  it("deduplicates features", () => {
    expect(calcFeatureParticipation(["checkIn", "checkIn", "checkIn"])).toBe(13);
  });

  it("returns 100 for all 8 features", () => {
    expect(
      calcFeatureParticipation([
        "checkIn", "missions", "journal", "mood",
        "budget", "todos", "activity", "friends",
      ])
    ).toBe(100);
  });
});

describe("calculateWeeklyEngagement", () => {
  const baseInput: WeeklyEngagementInput = {
    weekId: "2026-W12",
    checkInDaysThisWeek: 0,
    missionsCompleted: 0,
    missionsTotal: 0,
    currentStreak: 0,
    featuresUsed: [],
    daysRemaining: 5,
  };

  it("returns all zeros and 'none' tier for empty input", () => {
    const result = calculateWeeklyEngagement(baseInput);
    expect(result.overall).toBe(0);
    expect(result.tier).toBe("none");
    expect(result.checkInCompletion).toBe(0);
    expect(result.actionCompletion).toBe(0);
    expect(result.streakStrength).toBe(0);
    expect(result.featureParticipation).toBe(0);
    expect(result.weekId).toBe("2026-W12");
    expect(result.daysRemaining).toBe(5);
  });

  it("returns 100 and 'gold' tier for perfect engagement", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      checkInDaysThisWeek: 7,
      missionsCompleted: 3,
      missionsTotal: 3,
      currentStreak: 30,
      featuresUsed: [
        "checkIn", "missions", "journal", "mood",
        "budget", "todos", "activity", "friends",
      ],
    });
    expect(result.overall).toBe(100);
    expect(result.tier).toBe("gold");
  });

  it("returns 'bronze' for check-ins only (40%)", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      checkInDaysThisWeek: 7,
    });
    // 100 * 0.4 = 40 → bronze
    expect(result.overall).toBe(40);
    expect(result.tier).toBe("bronze");
  });

  it("returns 'silver' for check-ins + missions (70%)", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      checkInDaysThisWeek: 7,
      missionsCompleted: 3,
      missionsTotal: 3,
    });
    // checkIn: 100*0.4=40, actions: 100*0.3=30, total=70 → silver
    expect(result.overall).toBe(70);
    expect(result.tier).toBe("silver");
  });

  it("preserves weekId and daysRemaining", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      weekId: "2026-W15",
      daysRemaining: 2,
    });
    expect(result.weekId).toBe("2026-W15");
    expect(result.daysRemaining).toBe(2);
  });

  it("calculates realistic mid-week engagement", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      checkInDaysThisWeek: 3,
      missionsCompleted: 1,
      missionsTotal: 3,
      currentStreak: 3,
      featuresUsed: ["checkIn", "missions"],
      daysRemaining: 4,
    });
    // checkIn: 43*0.4=17.1, actions: 33*0.3=10.0, streak: ~40*0.2=8.0, features: 25*0.1=2.5
    // overall ≈ 38 → bronze
    expect(result.overall).toBeGreaterThan(30);
    expect(result.overall).toBeLessThan(50);
    expect(result.tier).toBe("bronze");
  });

  it("clamps overall to 0-100", () => {
    const result = calculateWeeklyEngagement({
      ...baseInput,
      checkInDaysThisWeek: 7,
      missionsCompleted: 3,
      missionsTotal: 3,
      currentStreak: 100,
      featuresUsed: [
        "checkIn", "missions", "journal", "mood",
        "budget", "todos", "activity", "friends",
      ],
    });
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });
});
