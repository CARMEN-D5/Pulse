/**
 * Date utility functions used across the app.
 */
import { format, isToday, isYesterday, differenceInDays } from "date-fns";

/** Format a date as YYYY-MM-DD (used as Firestore document IDs) */
export function toDateId(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/** Format a date for display (e.g., "Monday, 19 March") */
export function formatDisplayDate(date: Date): string {
  return format(date, "EEEE, d MMMM");
}

/** Format a date for compact display (e.g., "19 Mar") */
export function formatShortDate(date: Date): string {
  return format(date, "d MMM");
}

/** Get a friendly relative date label */
export function getRelativeDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  const days = differenceInDays(new Date(), date);
  if (days < 7) return `${days} days ago`;
  return formatShortDate(date);
}

/** Get week ID string (e.g., "2026-W12") */
export function getWeekId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.ceil(
    (date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const weekNumber = Math.ceil(dayOfYear / 7);
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}
