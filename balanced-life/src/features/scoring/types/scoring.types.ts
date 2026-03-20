import { DomainId } from "../../../config/domains";

/** Scores for all 5 domains */
export type DomainScores = Record<DomainId, number>;

/** The complete balance score result */
export interface BalanceScoreResult {
  domainScores: DomainScores;
  wellnessLevel: number;
  standardDeviation: number;
  balanceFactor: number;
  balanceScore: number;
}

/** A daily score snapshot (stored in Firestore) */
export interface DailyScoreSnapshot {
  date: string; // YYYY-MM-DD
  domainScores: DomainScores;
  balanceScore: number;
  wellnessLevel: number;
  balanceFactor: number;
  streakCount: number;
}

/** Raw weekly input for a single domain */
export interface WeeklyDomainInput {
  checkInAverage: number; // 0-100: average of daily check-in ratings scaled
  actionCompletionRate: number; // 0-100: (completed / assigned) * 100
  consistencyRate: number; // 0-100: (days engaged / 7) * 100
}
