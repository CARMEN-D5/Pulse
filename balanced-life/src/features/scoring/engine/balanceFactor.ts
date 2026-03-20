/**
 * Balance Factor Calculator
 *
 * Measures how evenly spread the 5 domain scores are using Standard Deviation.
 * A perfectly balanced user gets factor 1.0 (no penalty).
 * An extremely unbalanced user gets factor 0.5 (50% penalty).
 *
 * Formula: Balance Factor = 1 - (SD / 100) * 0.5
 * See Scoring_System.docx Section 5 for full derivation.
 */

import {
  BALANCE_PENALTY_MULTIPLIER,
  BALANCE_SD_DIVISOR,
  BALANCE_FACTOR_MIN,
  BALANCE_FACTOR_MAX,
} from "../../../config/scoring";

/**
 * Calculate the standard deviation of an array of numbers.
 * Uses population SD (divides by N, not N-1) since we always have exactly 5 domains.
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Calculate the Balance Factor from domain scores.
 *
 * @param domainScores - Array of 5 domain scores (each 0-100)
 * @returns Balance Factor between 0.5 and 1.0
 *
 * @example
 * calculateBalanceFactor([60, 60, 60, 60, 60]) // 1.0 (perfect balance)
 * calculateBalanceFactor([90, 10, 90, 10, 50]) // ~0.81 (heavy penalty)
 */
export function calculateBalanceFactor(domainScores: number[]): number {
  const sd = standardDeviation(domainScores);

  const rawFactor =
    1 - (sd / BALANCE_SD_DIVISOR) * BALANCE_PENALTY_MULTIPLIER;

  // Clamp to [0.5, 1.0]
  return Math.max(BALANCE_FACTOR_MIN, Math.min(BALANCE_FACTOR_MAX, rawFactor));
}
