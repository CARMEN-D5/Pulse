/**
 * Weekly Engagement Score Calculator (pure logic, no Firestore)
 *
 * Resets every Monday — a fresh start each week. No long-term punishment.
 * Score determines a reward tier at the end of the week:
 *
 *   None   (0-29):   Barely engaged
 *   Bronze (30-59):  Basic check-ins done
 *   Silver (60-84):  Check-ins + missions
 *   Gold   (85-100): Fully engaged across features
 *
 * Components (scoped to current week only):
 *  - Check-in completion (40%): days checked in this week / 7
 *  - Action completion (30%): missions completed / assigned this week
 *  - Streak strength (20%): current streak mapped to 0-100 curve
 *  - Feature participation (10%): distinct features used this week
 */

import { ENGAGEMENT_WEIGHTS } from "../../../config/scoring";
import { WeeklyEngagement, RewardTier } from "../types/scoring.types";

/** Maximum streak days before the curve plateaus */
const STREAK_PLATEAU = 30;

/** Reward tier thresholds */
const TIER_THRESHOLDS = {
  gold: 85,
  silver: 60,
  bronze: 30,
} as const;

/** All trackable features in the app */
export const TRACKABLE_FEATURES = [
  "checkIn",
  "missions",
  "journal",
  "mood",
  "budget",
  "todos",
  "activity",
  "friends",
] as const;

export type FeatureKey = (typeof TRACKABLE_FEATURES)[number];

export interface WeeklyEngagementInput {
  /** ISO week ID, e.g. "2026-W12" */
  weekId: string;
  /** Number of check-ins this week (0-7) */
  checkInDaysThisWeek: number;
  /** Number of missions completed this week */
  missionsCompleted: number;
  /** Total missions assigned this week */
  missionsTotal: number;
  /** Current streak length in days */
  currentStreak: number;
  /** Features the user has engaged with this week */
  featuresUsed: FeatureKey[];
  /** Days remaining in the current week (0-6) */
  daysRemaining: number;
}

/**
 * Determine the reward tier for a given score.
 */
export function getRewardTier(score: number): RewardTier {
  if (score >= TIER_THRESHOLDS.gold) return "gold";
  if (score >= TIER_THRESHOLDS.silver) return "silver";
  if (score >= TIER_THRESHOLDS.bronze) return "bronze";
  return "none";
}

/**
 * Calculate the check-in completion sub-score.
 * (daysCheckedIn / 7) × 100.
 */
export function calcCheckInCompletion(daysThisWeek: number): number {
  const clamped = Math.max(0, Math.min(7, daysThisWeek));
  return Math.round((clamped / 7) * 100);
}

/**
 * Calculate the action/mission completion sub-score.
 * (completed / total) × 100. Returns 0 if no missions assigned.
 */
export function calcActionCompletion(completed: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = Math.max(0, Math.min(completed, total)) / total;
  return Math.round(ratio * 100);
}

/**
 * Calculate streak strength sub-score.
 * Logarithmic curve — early streaks matter most:
 *   score = min(100, (ln(streak + 1) / ln(plateau + 1)) × 100)
 *
 * Streak 1  → ~11,  Streak 7  → ~57
 * Streak 14 → ~77,  Streak 30 → 100
 */
export function calcStreakStrength(streak: number): number {
  if (streak <= 0) return 0;
  const score = (Math.log(streak + 1) / Math.log(STREAK_PLATEAU + 1)) * 100;
  return Math.round(Math.min(100, score));
}

/**
 * Calculate feature participation sub-score.
 * (features used / total trackable features) × 100.
 */
export function calcFeatureParticipation(featuresUsed: FeatureKey[]): number {
  const unique = new Set(featuresUsed);
  const ratio = unique.size / TRACKABLE_FEATURES.length;
  return Math.round(ratio * 100);
}

/**
 * Calculate the full Weekly Engagement Score.
 * All inputs are scoped to the current week. Resets every Monday.
 */
export function calculateWeeklyEngagement(input: WeeklyEngagementInput): WeeklyEngagement {
  const checkInCompletion = calcCheckInCompletion(input.checkInDaysThisWeek);
  const actionCompletion = calcActionCompletion(input.missionsCompleted, input.missionsTotal);
  const streakStrength = calcStreakStrength(input.currentStreak);
  const featureParticipation = calcFeatureParticipation(input.featuresUsed);

  const overall = Math.round(
    ENGAGEMENT_WEIGHTS.checkInCompletion * checkInCompletion +
    ENGAGEMENT_WEIGHTS.actionCompletion * actionCompletion +
    ENGAGEMENT_WEIGHTS.streakStrength * streakStrength +
    ENGAGEMENT_WEIGHTS.featureParticipation * featureParticipation
  );

  const clampedOverall = Math.max(0, Math.min(100, overall));

  return {
    weekId: input.weekId,
    overall: clampedOverall,
    tier: getRewardTier(clampedOverall),
    checkInCompletion,
    actionCompletion,
    streakStrength,
    featureParticipation,
    daysRemaining: input.daysRemaining,
  };
}
