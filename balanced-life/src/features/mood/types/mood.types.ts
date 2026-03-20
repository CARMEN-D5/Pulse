/**
 * Mood Tracker type definitions.
 *
 * Users log one mood per day (typically after check-in).
 * Stored at: users/{uid}/moods/{YYYY-MM-DD}
 */

/** 5-level mood scale from very bad → great */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodOption {
  level: MoodLevel;
  emoji: string;
  label: string;
  color: string;
}

/** Firestore document shape for a daily mood entry */
export interface MoodEntry {
  level: MoodLevel;
  emoji: string;
  label: string;
  note?: string;
  createdAt: string; // ISO timestamp
}

/** Mood entry with date key (for lists/charts) */
export interface MoodDataPoint {
  date: string; // YYYY-MM-DD
  level: MoodLevel;
  emoji: string;
  label: string;
  note?: string;
}

/** The 5 mood options available to users */
export const MOOD_OPTIONS: MoodOption[] = [
  { level: 1, emoji: "😔", label: "Awful", color: "#EF4444" },
  { level: 2, emoji: "😕", label: "Bad", color: "#F97316" },
  { level: 3, emoji: "😐", label: "Okay", color: "#F59E0B" },
  { level: 4, emoji: "😊", label: "Good", color: "#22C55E" },
  { level: 5, emoji: "😄", label: "Great", color: "#10B981" },
];
