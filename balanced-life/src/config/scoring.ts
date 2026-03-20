/**
 * Scoring system configuration constants.
 * See Scoring_System.docx for full derivation and documentation.
 */

/** Exponential Moving Average alpha — controls how much weight current week gets */
export const EMA_ALPHA = 0.3;

/** Domain score input weights — must sum to 1.0 */
export const SCORE_WEIGHTS = {
  checkIn: 0.3,
  actionCompletion: 0.4,
  consistency: 0.3,
} as const;

/** Balance Factor penalty multiplier (0.5 = max 50% penalty for extreme imbalance) */
export const BALANCE_PENALTY_MULTIPLIER = 0.5;

/** Balance Factor normalisation divisor (SD divided by this) */
export const BALANCE_SD_DIVISOR = 100;

/** Minimum Balance Factor (floor — prevents total score wipeout) */
export const BALANCE_FACTOR_MIN = 0.5;

/** Maximum Balance Factor (ceiling — perfect balance) */
export const BALANCE_FACTOR_MAX = 1.0;

/** Rolling window size for check-in average (days) */
export const ROLLING_WINDOW_DAYS = 7;

/** Score tiers for display labels and colours */
export const SCORE_TIERS = [
  { min: 0, max: 29, label: "Needs Attention", color: "#EF4444", message: "Let's start with small steps — pick one area to focus on" },
  { min: 30, max: 49, label: "Building", color: "#F97316", message: "You're making progress — consistency is key" },
  { min: 50, max: 64, label: "Getting There", color: "#EAB308", message: "Good momentum — keep balancing across all areas" },
  { min: 65, max: 79, label: "Well Balanced", color: "#22C55E", message: "Strong balance — you're managing life well" },
  { min: 80, max: 100, label: "Thriving", color: "#16A34A", message: "Exceptional balance — you're thriving across all domains" },
] as const;

/** Get the tier for a given score */
export function getScoreTier(score: number) {
  return SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? SCORE_TIERS[0];
}
