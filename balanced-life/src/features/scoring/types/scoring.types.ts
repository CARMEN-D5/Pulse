import { DomainId } from "../../../config/domains";

/** Scores for all 5 domains (each 0-100) */
export type DomainScores = Record<DomainId, number>;

/** The complete balance score result */
export interface BalanceScoreResult {
  domainScores: DomainScores;
  balanceScore: number;
  imbalanceSD: number;
}

/** A daily score snapshot (stored in Firestore) */
export interface DailyScoreSnapshot {
  date: string; // YYYY-MM-DD
  domainScores: DomainScores;
  balanceScore: number;
  streakCount: number;
}

/** Reward tier earned from weekly engagement */
export type RewardTier = "none" | "bronze" | "silver" | "gold";

/** Weekly engagement score — resets every Monday */
export interface WeeklyEngagement {
  weekId: string; // e.g. "2026-W12"
  overall: number; // 0-100
  tier: RewardTier;
  checkInCompletion: number; // 0-100: days checked in this week / 7
  actionCompletion: number; // 0-100: missions completed / assigned
  streakStrength: number; // 0-100: based on current streak length
  featureParticipation: number; // 0-100: features used this week
  daysRemaining: number; // days left in the current week
}
