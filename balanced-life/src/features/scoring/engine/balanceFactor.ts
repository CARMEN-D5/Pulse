/**
 * Statistical utilities for scoring.
 *
 * standardDeviation() is used as the imbalance indicator —
 * it measures how unevenly spread the 5 domain scores are.
 *
 * Note: The Balance Score no longer uses a multiplicative Balance Factor.
 * It now uses geometric mean, which naturally penalises neglected domains.
 * standardDeviation is kept for the imbalance indicator (weekly insights).
 */

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
