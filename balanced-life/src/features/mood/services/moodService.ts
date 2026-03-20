/**
 * Mood Service — Firestore CRUD for daily mood entries.
 *
 * Collection: users/{uid}/moods/{YYYY-MM-DD}
 * One mood per day (overwrites if logged again same day).
 */

import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { MoodEntry, MoodLevel, MoodDataPoint, MOOD_OPTIONS } from "../types/mood.types";

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Save a mood entry for today (or a specific date).
 */
export async function saveMood(
  userId: string,
  level: MoodLevel,
  note?: string,
  date?: Date
): Promise<MoodEntry> {
  const dateId = formatDate(date ?? new Date());
  const option = MOOD_OPTIONS.find((o) => o.level === level)!;

  const entry: MoodEntry = {
    level,
    emoji: option.emoji,
    label: option.label,
    ...(note ? { note } : {}),
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", userId, "moods", dateId), entry);
  return entry;
}

/**
 * Get today's mood (if already logged).
 */
export async function getTodayMood(userId: string): Promise<MoodEntry | null> {
  const dateId = formatDate(new Date());
  const snap = await getDoc(doc(db, "users", userId, "moods", dateId));
  return snap.exists() ? (snap.data() as MoodEntry) : null;
}

/**
 * Fetch mood history for the last N days.
 * Returns entries in chronological order.
 */
export async function fetchMoodHistory(
  userId: string,
  days: number = 30
): Promise<MoodDataPoint[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const results: MoodDataPoint[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dateId = formatDate(current);
    const snap = await getDoc(doc(db, "users", userId, "moods", dateId));
    if (snap.exists()) {
      const data = snap.data() as MoodEntry;
      results.push({
        date: dateId,
        level: data.level,
        emoji: data.emoji,
        label: data.label,
        note: data.note,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return results;
}

/**
 * Check if user has logged mood on any day in a date range.
 * Used by engagement service for feature detection.
 */
export async function hasMoodInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const current = new Date(startDate);
  while (current <= endDate) {
    const snap = await getDoc(doc(db, "users", userId, "moods", formatDate(current)));
    if (snap.exists()) return true;
    current.setDate(current.getDate() + 1);
  }
  return false;
}
