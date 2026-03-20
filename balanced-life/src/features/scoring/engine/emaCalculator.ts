/**
 * Daily EMA (Exponential Moving Average) Calculator
 *
 * Updates a domain score using today's signal and the previous score.
 *
 * Formula: new_score = α × today_signal + (1 - α) × previous_score
 *
 * With α = 0.12:
 *   - 12% weight on today's input
 *   - 88% weight on accumulated history
 *   - Score changes are immediate but gentle
 *
 * Anti-gaming: daily movement is capped at ±MAX_DAILY_MOVEMENT points per domain.
 */

import { DAILY_ALPHA, MAX_DAILY_MOVEMENT } from "../../../config/scoring";
import { DomainScores } from "../types/scoring.types";
import { DOMAIN_IDS, DomainId } from "../../../config/domains";

/**
 * Calculate the daily EMA step for a single domain.
 *
 * @param todaySignal - Today's domain signal (0-100)
 * @param previousScore - The previous domain score (0-100)
 * @param alpha - Smoothing factor (default DAILY_ALPHA = 0.12)
 * @returns Updated score, clamped to [0, 100] and capped at ±MAX_DAILY_MOVEMENT
 *
 * @example
 * dailyEmaStep(75, 62, 0.12)
 * // raw = 0.12 × 75 + 0.88 × 62 = 63.56
 * // movement = 1.56 (within ±3 cap)
 * // result = 63.6
 */
export function dailyEmaStep(
  todaySignal: number,
  previousScore: number,
  alpha: number = DAILY_ALPHA
): number {
  const rawNew = alpha * todaySignal + (1 - alpha) * previousScore;

  // Cap daily movement
  const movement = rawNew - previousScore;
  const cappedMovement = Math.max(
    -MAX_DAILY_MOVEMENT,
    Math.min(MAX_DAILY_MOVEMENT, movement)
  );
  const cappedScore = previousScore + cappedMovement;

  // Clamp to [0, 100] and round to 1 decimal
  return Math.round(Math.max(0, Math.min(100, cappedScore)) * 10) / 10;
}

/**
 * Update all 5 domain scores using daily EMA.
 *
 * @param todaySignals - Today's signals per domain (0-100)
 * @param previousScores - Previous domain scores (0-100)
 * @returns Updated domain scores
 */
export function updateDomainScoresDaily(
  todaySignals: DomainScores,
  previousScores: DomainScores
): DomainScores {
  const updated = {} as DomainScores;

  for (const domainId of DOMAIN_IDS) {
    updated[domainId] = dailyEmaStep(
      todaySignals[domainId],
      previousScores[domainId]
    );
  }

  return updated;
}

/**
 * Build today's domain signal by blending check-in and action signals.
 * For MVP: actions default to 0 (not yet implemented), so check-in is the full signal.
 *
 * @param checkInSignal - Check-in answer mapped to 0-100
 * @param actionSignal - Action completion signal 0-100 (optional, defaults to check-in)
 * @returns Blended signal 0-100
 */
export function buildDailySignal(
  checkInSignal: number,
  actionSignal?: number
): number {
  // If no action data, just use check-in as the full signal
  if (actionSignal == null) return checkInSignal;
  return 0.7 * checkInSignal + 0.3 * actionSignal;
}
