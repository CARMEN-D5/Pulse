/**
 * Weekly Review type definitions.
 *
 * The Weekly Review aggregates a full Mon–Sun week of user activity
 * into a summary screen with insights, domain trends, and mission recap.
 */

import { DomainId } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { WeeklyEngagement, RewardTier } from "../../scoring/types/scoring.types";
import { AssignedMission } from "../../missions/types/mission.types";
import { MoodDataPoint } from "../../mood/types/mood.types";

/** Summary statistics for the week */
export interface WeekSummary {
  /** Total check-ins completed (0–7) */
  checkInCount: number;
  /** Average balance score across the week */
  avgBalanceScore: number;
  /** Best balance score this week */
  bestScore: number;
  /** Best score day label (e.g. "Monday") */
  bestDay: string;
  /** Worst balance score this week */
  worstScore: number;
  /** Domain that improved the most */
  mostImprovedDomain: DomainId | null;
  /** Amount of improvement for the best domain */
  mostImprovedAmount: number;
  /** Domain that declined the most */
  needsAttentionDomain: DomainId | null;
  /** Amount of decline for the worst domain */
  needsAttentionAmount: number;
  /** Current streak at end of week */
  streakCount: number;
}

/** Daily snapshot for the review (simplified) */
export interface ReviewDaySnapshot {
  date: string;
  dayLabel: string; // "Mon", "Tue", ...
  balanceScore: number;
  domainScores: DomainScores;
  streakCount: number;
}

/** Full weekly review data package */
export interface WeeklyReviewData {
  weekId: string;
  weekLabel: string; // e.g. "Mar 17 – Mar 23"
  engagement: WeeklyEngagement;
  missions: {
    completed: AssignedMission[];
    skipped: AssignedMission[];
    pending: AssignedMission[];
    totalCount: number;
    completedCount: number;
  };
  dailySnapshots: ReviewDaySnapshot[];
  summary: WeekSummary;
  moods: MoodDataPoint[];
  /** Motivational insight text based on the week's data */
  insight: string;
}
