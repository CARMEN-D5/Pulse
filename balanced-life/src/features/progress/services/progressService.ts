/**
 * Progress Service
 *
 * Fetches daily score snapshots from Firestore for trend charts.
 * Snapshots are saved by the check-in service after each daily check-in.
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  balanceScore: number;
  domainScores: DomainScores;
  streakCount: number;
}

export type TimeRange = "7d" | "30d" | "90d";

/** Get date string for N days ago in YYYY-MM-DD format */
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Map time range to number of days */
function rangeToDays(range: TimeRange): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
  }
}

/**
 * Fetch daily snapshots for a user within a time range.
 * Returns snapshots sorted by date ascending (oldest first).
 */
export async function fetchSnapshots(
  userId: string,
  range: TimeRange
): Promise<DailySnapshot[]> {
  const days = rangeToDays(range);
  const startDate = daysAgoStr(days);

  const q = query(
    collection(db, "users", userId, "dailySnapshots"),
    where("date", ">=", startDate),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  const snapshots: DailySnapshot[] = [];

  snap.forEach((doc) => {
    const data = doc.data();
    snapshots.push({
      date: data.date,
      balanceScore: data.balanceScore ?? 0,
      domainScores: data.domainScores ?? {},
      streakCount: data.streakCount ?? 0,
    });
  });

  return snapshots;
}

/** Format date for chart label based on range */
export function formatDateLabel(dateStr: string, range: TimeRange): string {
  const [, month, day] = dateStr.split("-");
  if (range === "7d") {
    // Show day name for 7-day view
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", { weekday: "short" });
  }
  // Show "D/M" for 30d and 90d
  return `${parseInt(day)}/${parseInt(month)}`;
}

/** Extract balance score data points for the chart */
export function toBalanceScoreData(snapshots: DailySnapshot[], range: TimeRange) {
  return snapshots.map((s) => ({
    value: s.balanceScore,
    label: formatDateLabel(s.date, range),
    date: s.date,
  }));
}

/** Extract a single domain's data points for the chart */
export function toDomainData(
  snapshots: DailySnapshot[],
  domainId: DomainId,
  range: TimeRange
) {
  return snapshots.map((s) => ({
    value: s.domainScores[domainId] ?? 0,
    label: formatDateLabel(s.date, range),
    date: s.date,
  }));
}
