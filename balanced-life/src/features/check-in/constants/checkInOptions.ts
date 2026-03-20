export const CHECK_IN_OPTIONS = [
  { value: 0, label: "No", emoji: "😔" },
  { value: 1, label: "A little", emoji: "😐" },
  { value: 2, label: "Yes", emoji: "😊" },
] as const;

export type CheckInValue = 0 | 1 | 2;

/** Max points per domain per day */
export const MAX_DAILY_POINTS = 2;

/** Rolling window for score calculation */
export const ROLLING_DAYS = 7;

/** Max possible weekly total per domain (7 days × 2 points) */
export const MAX_WEEKLY_TOTAL = ROLLING_DAYS * MAX_DAILY_POINTS;
