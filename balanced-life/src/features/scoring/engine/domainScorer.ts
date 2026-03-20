/**
 * Domain Score Calculator
 *
 * Calculates a single domain's weekly score from 3 input layers:
 * - Check-in responses (30%)
 * - Action completion rate (40%)
 * - Consistency / engagement rate (30%)
 *
 * See Scoring_System.docx Section 3 for details.
 */

import { SCORE_WEIGHTS } from "../../../config/scoring";
import { WeeklyDomainInput } from "../types/scoring.types";

/**
 * Calculate a single domain's weekly raw score (0-100).
 *
 * @param input - The three input layers for this domain
 * @returns Score between 0 and 100
 *
 * @example
 * calculateDomainScore({
 *   checkInAverage: 80,      // user felt good (avg of daily ratings)
 *   actionCompletionRate: 66, // completed 2 of 3 actions
 *   consistencyRate: 71,      // engaged 5 of 7 days
 * })
 * // (80 * 0.3) + (66 * 0.4) + (71 * 0.3) = 24 + 26.4 + 21.3 = 71.7
 */
export function calculateDomainScore(input: WeeklyDomainInput): number {
  const score =
    input.checkInAverage * SCORE_WEIGHTS.checkIn +
    input.actionCompletionRate * SCORE_WEIGHTS.actionCompletion +
    input.consistencyRate * SCORE_WEIGHTS.consistency;

  // Clamp to 0-100 and round to 1 decimal
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}
