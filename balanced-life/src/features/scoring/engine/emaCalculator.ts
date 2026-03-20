/**
 * Exponential Moving Average (EMA) Calculator
 *
 * Smoothly evolves domain scores over time.
 * New Score = (α × This Week's Score) + ((1 - α) × Previous Score)
 *
 * With α = 0.3:
 * - 30% weight on this week's data
 * - 70% weight on accumulated history
 * - Initial quiz fades to <6% influence after 8 weeks
 *
 * See Scoring_System.docx Section 7 for real-world examples.
 */

import { EMA_ALPHA } from "../../../config/scoring";
import { DomainScores } from "../types/scoring.types";
import { DOMAIN_IDS, DomainId } from "../../../config/domains";

/**
 * Calculate the new EMA value from a current input and previous score.
 *
 * @param currentWeekScore - This week's raw domain score (0-100)
 * @param previousScore - The previous EMA score (0-100)
 * @param alpha - Smoothing factor (default 0.3)
 * @returns Updated EMA score (0-100)
 *
 * @example
 * emaStep(75, 25, 0.3) // 40 — first week after quiz score of 25
 * emaStep(75, 40, 0.3) // 50.5 — second week
 */
export function emaStep(
  currentWeekScore: number,
  previousScore: number,
  alpha: number = EMA_ALPHA
): number {
  const result = alpha * currentWeekScore + (1 - alpha) * previousScore;
  return Math.round(result * 10) / 10; // 1 decimal place
}

/**
 * Update all 5 domain scores using EMA.
 *
 * @param weeklyScores - This week's raw scores per domain (0-100)
 * @param previousScores - Previous EMA scores per domain (0-100)
 * @returns Updated domain scores
 */
export function updateDomainScoresEMA(
  weeklyScores: DomainScores,
  previousScores: DomainScores
): DomainScores {
  const updated = {} as DomainScores;

  for (const domainId of DOMAIN_IDS) {
    updated[domainId] = emaStep(
      weeklyScores[domainId],
      previousScores[domainId]
    );
  }

  return updated;
}

/**
 * Calculate the effective weight of the initial quiz after N weeks.
 * Weight = (1 - alpha)^N
 *
 * @param weeksElapsed - Number of weeks since the quiz
 * @returns Weight as a decimal (e.g. 0.34 after 3 weeks with α=0.3)
 */
export function quizWeightAfterWeeks(weeksElapsed: number): number {
  return Math.pow(1 - EMA_ALPHA, weeksElapsed);
}
