/**
 * Badge type definitions.
 */

/** All badge IDs */
export type BadgeId =
  // Streak milestones
  | "first-checkin"
  | "streak-3"
  | "streak-7"
  | "streak-14"
  | "streak-30"
  | "streak-60"
  | "streak-90"
  // Score milestones
  | "score-50"
  | "score-65"
  | "score-80"
  // Mission milestones
  | "first-mission"
  | "missions-week-complete"
  | "missions-10"
  // Weekly engagement tiers
  | "first-bronze"
  | "first-silver"
  | "first-gold"
  // Special
  | "perfect-week"
  | "balanced-life";

/** A badge definition in the library */
export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
  category: "streak" | "score" | "missions" | "engagement" | "special";
}

/** A badge the user has unlocked (stored in Firestore) */
export interface UnlockedBadge {
  id: BadgeId;
  unlockedAt: string; // ISO date
}

/** Context data used to check badge unlock conditions */
export interface BadgeCheckContext {
  currentStreak: number;
  balanceScore: number;
  totalMissionsCompleted: number;
  weeklyMissionsCompleted: number;
  weeklyMissionsTotal: number;
  weeklyCheckInDays: number;
  currentTier: "none" | "bronze" | "silver" | "gold";
  /** All 5 domain scores are >= 65 */
  allDomainsAbove65: boolean;
}
