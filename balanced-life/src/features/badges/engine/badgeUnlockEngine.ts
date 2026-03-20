/**
 * Badge Unlock Engine (pure logic, no Firestore)
 *
 * Given the user's current context and already-unlocked badges,
 * determines which new badges should be unlocked.
 */

import { BadgeId, BadgeCheckContext } from "../types/badge.types";

/**
 * Check all badge conditions and return newly unlocked badge IDs.
 * Only returns badges that aren't already in `alreadyUnlocked`.
 */
export function checkBadgeUnlocks(
  context: BadgeCheckContext,
  alreadyUnlocked: BadgeId[]
): BadgeId[] {
  const unlocked = new Set(alreadyUnlocked);
  const newBadges: BadgeId[] = [];

  function tryUnlock(id: BadgeId, condition: boolean) {
    if (!unlocked.has(id) && condition) {
      newBadges.push(id);
    }
  }

  // ── Streak badges ──
  tryUnlock("first-checkin", context.currentStreak >= 1);
  tryUnlock("streak-3", context.currentStreak >= 3);
  tryUnlock("streak-7", context.currentStreak >= 7);
  tryUnlock("streak-14", context.currentStreak >= 14);
  tryUnlock("streak-30", context.currentStreak >= 30);
  tryUnlock("streak-60", context.currentStreak >= 60);
  tryUnlock("streak-90", context.currentStreak >= 90);

  // ── Score badges ──
  tryUnlock("score-50", context.balanceScore >= 50);
  tryUnlock("score-65", context.balanceScore >= 65);
  tryUnlock("score-80", context.balanceScore >= 80);

  // ── Mission badges ──
  tryUnlock("first-mission", context.totalMissionsCompleted >= 1);
  tryUnlock("missions-10", context.totalMissionsCompleted >= 10);
  tryUnlock(
    "missions-week-complete",
    context.weeklyMissionsTotal > 0 &&
      context.weeklyMissionsCompleted >= context.weeklyMissionsTotal
  );

  // ── Engagement tier badges ──
  tryUnlock(
    "first-bronze",
    context.currentTier === "bronze" ||
      context.currentTier === "silver" ||
      context.currentTier === "gold"
  );
  tryUnlock(
    "first-silver",
    context.currentTier === "silver" || context.currentTier === "gold"
  );
  tryUnlock("first-gold", context.currentTier === "gold");

  // ── Special badges ──
  tryUnlock(
    "perfect-week",
    context.weeklyCheckInDays >= 7 &&
      context.weeklyMissionsTotal > 0 &&
      context.weeklyMissionsCompleted >= context.weeklyMissionsTotal
  );
  tryUnlock("balanced-life", context.allDomainsAbove65);

  return newBadges;
}
