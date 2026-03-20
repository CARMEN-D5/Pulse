/**
 * Daily check-in answer options.
 *
 * 1-5 scale matching the assessment:
 *   1 = Never → 0
 *   2 = Rarely → 25
 *   3 = Sometimes → 50
 *   4 = Often → 75
 *   5 = Always → 100
 *
 * Conversion formula: score = ((value - 1) / 4) * 100
 */

export const CHECK_IN_OPTIONS = [
  { value: 1, label: "Not at all", emoji: "😔", score: 0 },
  { value: 2, label: "A little", emoji: "😕", score: 25 },
  { value: 3, label: "Somewhat", emoji: "😐", score: 50 },
  { value: 4, label: "Mostly", emoji: "😊", score: 75 },
  { value: 5, label: "Definitely", emoji: "😄", score: 100 },
] as const;

export type CheckInValue = 1 | 2 | 3 | 4 | 5;

/** Convert a check-in answer (1-5) to a 0-100 signal */
export function checkInValueToScore(value: CheckInValue): number {
  return ((value - 1) / 4) * 100;
}
