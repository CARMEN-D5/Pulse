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

/** Engagement score breakdown */
export interface EngagementScore {
  overall: number; // 0-100
  checkInCompletion: number; // 0-100: days checked in / 7
  actionCompletion: number; // 0-100: actions completed / assigned
  streakStrength: number; // 0-100: based on current streak length
  featureParticipation: number; // 0-100: features used
}
