/**
 * Domain Score Calculator (Weekly Layer)
 *
 * Used in the weekly review process to summarise domain performance.
 * Weekly domain signal = 0.5 × check-in average + 0.5 × action completion
 *
 * This is NOT used for daily score updates (those use EMA).
 * It supports weekly insights, mission generation, and trend validation.
 */

export interface WeeklyDomainSummary {
  checkInAverage: number; // 0-100: average of daily check-in scores this week
  actionCompletionScore: number; // 0-100: feature/action completion rate
}

/**
 * Calculate a domain's weekly summary signal.
 *
 * @param summary - Weekly check-in average and action completion
 * @returns Weekly domain signal between 0 and 100
 *
 * @example
 * calculateWeeklyDomainSignal({ checkInAverage: 70, actionCompletionScore: 65 })
 * // (0.5 × 70) + (0.5 × 65) = 67.5
 */
export function calculateWeeklyDomainSignal(summary: WeeklyDomainSummary): number {
  const score = 0.5 * summary.checkInAverage + 0.5 * summary.actionCompletionScore;
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}
