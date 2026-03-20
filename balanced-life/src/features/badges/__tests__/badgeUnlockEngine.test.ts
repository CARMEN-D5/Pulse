import { checkBadgeUnlocks } from "../engine/badgeUnlockEngine";
import { BadgeCheckContext, BadgeId } from "../types/badge.types";

const emptyContext: BadgeCheckContext = {
  currentStreak: 0,
  balanceScore: 0,
  totalMissionsCompleted: 0,
  weeklyMissionsCompleted: 0,
  weeklyMissionsTotal: 0,
  weeklyCheckInDays: 0,
  currentTier: "none",
  allDomainsAbove65: false,
};

describe("checkBadgeUnlocks", () => {
  it("returns empty array when no conditions are met", () => {
    expect(checkBadgeUnlocks(emptyContext, [])).toEqual([]);
  });

  // ── Streak badges ──
  it("unlocks first-checkin on streak >= 1", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, currentStreak: 1 }, []);
    expect(result).toContain("first-checkin");
  });

  it("unlocks streak-3 on streak >= 3", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, currentStreak: 3 }, []);
    expect(result).toContain("streak-3");
    expect(result).toContain("first-checkin"); // also unlocked
  });

  it("unlocks streak-7 on streak >= 7", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, currentStreak: 7 }, []);
    expect(result).toContain("streak-7");
  });

  it("unlocks all streak badges at once for streak 90", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, currentStreak: 90 }, []);
    expect(result).toContain("first-checkin");
    expect(result).toContain("streak-3");
    expect(result).toContain("streak-7");
    expect(result).toContain("streak-14");
    expect(result).toContain("streak-30");
    expect(result).toContain("streak-60");
    expect(result).toContain("streak-90");
  });

  // ── Score badges ──
  it("unlocks score-50 at balance score 50", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, balanceScore: 50 }, []);
    expect(result).toContain("score-50");
    expect(result).not.toContain("score-65");
  });

  it("unlocks score-65 at balance score 65", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, balanceScore: 65 }, []);
    expect(result).toContain("score-50");
    expect(result).toContain("score-65");
  });

  it("unlocks score-80 at balance score 80", () => {
    const result = checkBadgeUnlocks({ ...emptyContext, balanceScore: 80 }, []);
    expect(result).toContain("score-80");
  });

  // ── Mission badges ──
  it("unlocks first-mission on 1 total mission", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, totalMissionsCompleted: 1 },
      []
    );
    expect(result).toContain("first-mission");
  });

  it("unlocks missions-10 on 10 total missions", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, totalMissionsCompleted: 10 },
      []
    );
    expect(result).toContain("missions-10");
    expect(result).toContain("first-mission");
  });

  it("unlocks missions-week-complete when all weekly missions done", () => {
    const result = checkBadgeUnlocks(
      {
        ...emptyContext,
        weeklyMissionsCompleted: 3,
        weeklyMissionsTotal: 3,
        totalMissionsCompleted: 3,
      },
      []
    );
    expect(result).toContain("missions-week-complete");
  });

  it("does not unlock missions-week-complete when no missions assigned", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, weeklyMissionsCompleted: 0, weeklyMissionsTotal: 0 },
      []
    );
    expect(result).not.toContain("missions-week-complete");
  });

  // ── Engagement tier badges ──
  it("unlocks first-bronze on bronze tier", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, currentTier: "bronze" },
      []
    );
    expect(result).toContain("first-bronze");
    expect(result).not.toContain("first-silver");
  });

  it("unlocks first-bronze and first-silver on silver tier", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, currentTier: "silver" },
      []
    );
    expect(result).toContain("first-bronze");
    expect(result).toContain("first-silver");
    expect(result).not.toContain("first-gold");
  });

  it("unlocks all tier badges on gold", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, currentTier: "gold" },
      []
    );
    expect(result).toContain("first-bronze");
    expect(result).toContain("first-silver");
    expect(result).toContain("first-gold");
  });

  // ── Special badges ──
  it("unlocks perfect-week for 7/7 check-ins + all missions", () => {
    const result = checkBadgeUnlocks(
      {
        ...emptyContext,
        weeklyCheckInDays: 7,
        weeklyMissionsCompleted: 3,
        weeklyMissionsTotal: 3,
        totalMissionsCompleted: 3,
      },
      []
    );
    expect(result).toContain("perfect-week");
  });

  it("does not unlock perfect-week with 6/7 check-ins", () => {
    const result = checkBadgeUnlocks(
      {
        ...emptyContext,
        weeklyCheckInDays: 6,
        weeklyMissionsCompleted: 3,
        weeklyMissionsTotal: 3,
      },
      []
    );
    expect(result).not.toContain("perfect-week");
  });

  it("unlocks balanced-life when all domains >= 65", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, allDomainsAbove65: true },
      []
    );
    expect(result).toContain("balanced-life");
  });

  it("does not unlock balanced-life when not all domains >= 65", () => {
    const result = checkBadgeUnlocks(
      { ...emptyContext, allDomainsAbove65: false },
      []
    );
    expect(result).not.toContain("balanced-life");
  });

  // ── Already unlocked filtering ──
  it("does not re-unlock already unlocked badges", () => {
    const alreadyUnlocked: BadgeId[] = ["first-checkin", "streak-3", "streak-7"];
    const result = checkBadgeUnlocks(
      { ...emptyContext, currentStreak: 7 },
      alreadyUnlocked
    );
    expect(result).not.toContain("first-checkin");
    expect(result).not.toContain("streak-3");
    expect(result).not.toContain("streak-7");
  });

  it("only returns new badges when some already unlocked", () => {
    const alreadyUnlocked: BadgeId[] = ["first-checkin", "streak-3"];
    const result = checkBadgeUnlocks(
      { ...emptyContext, currentStreak: 7 },
      alreadyUnlocked
    );
    expect(result).toContain("streak-7");
    expect(result).not.toContain("first-checkin");
  });

  // ── Combined scenario ──
  it("handles complex real-world scenario", () => {
    const result = checkBadgeUnlocks(
      {
        currentStreak: 14,
        balanceScore: 72,
        totalMissionsCompleted: 12,
        weeklyMissionsCompleted: 3,
        weeklyMissionsTotal: 3,
        weeklyCheckInDays: 7,
        currentTier: "gold",
        allDomainsAbove65: true,
      },
      ["first-checkin", "streak-3", "streak-7", "score-50", "first-mission"]
    );

    // Should unlock these new ones:
    expect(result).toContain("streak-14");
    expect(result).toContain("score-65");
    expect(result).toContain("missions-10");
    expect(result).toContain("missions-week-complete");
    expect(result).toContain("first-bronze");
    expect(result).toContain("first-silver");
    expect(result).toContain("first-gold");
    expect(result).toContain("perfect-week");
    expect(result).toContain("balanced-life");

    // Should NOT include already unlocked
    expect(result).not.toContain("first-checkin");
    expect(result).not.toContain("streak-3");
    expect(result).not.toContain("streak-7");
    expect(result).not.toContain("score-50");
    expect(result).not.toContain("first-mission");
  });
});
