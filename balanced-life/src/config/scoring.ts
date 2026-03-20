/**
 * Scoring system configuration constants.
 *
 * Two-layer scoring architecture:
 * - Daily layer: EMA-based immediate updates from check-ins + actions
 * - Weekly layer: summaries, engagement analytics, mission generation
 *
 * Balance Score uses geometric mean to naturally penalise neglected domains.
 */

/** Daily EMA alpha — controls how much today's signal moves the score.
 *  0.12 means 12% weight on today, 88% on history.
 *  Gives meaningful daily movement without wild swings. */
export const DAILY_ALPHA = 0.12;

/** Blend weights for daily domain signal.
 *  Check-in is the primary input; actions reinforce it. */
export const DAILY_SIGNAL_WEIGHTS = {
  checkIn: 0.7,
  actions: 0.3,
} as const;

/** Maximum daily score movement per domain (anti-gaming protection) */
export const MAX_DAILY_MOVEMENT = 3;

/** Floor value before geometric mean to prevent zero-collapse */
export const GEO_MEAN_FLOOR = 1;

/** Weekly engagement score weights */
export const ENGAGEMENT_WEIGHTS = {
  checkInCompletion: 0.4,
  actionCompletion: 0.3,
  streakStrength: 0.2,
  featureParticipation: 0.1,
} as const;

/** Reward tier thresholds for weekly engagement */
export const REWARD_TIER_THRESHOLDS = {
  gold: 85,
  silver: 60,
  bronze: 30,
} as const;

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
