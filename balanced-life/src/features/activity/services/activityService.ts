/**
 * Activity Service — CRUD for physical activity logs in Firestore.
 *
 * Collection: users/{uid}/activities/{autoId}
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { ActivityEntry, ActivityType, Intensity } from "../types/activity.types";

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Save a new activity entry */
export async function logActivity(
  userId: string,
  data: {
    type: ActivityType;
    duration: number;
    intensity: Intensity;
    note: string;
  }
): Promise<ActivityEntry> {
  const now = new Date();
  const entry = {
    type: data.type,
    duration: data.duration,
    intensity: data.intensity,
    note: data.note,
    date: formatDate(now),
    createdAt: now.toISOString(),
  };

  const ref = await addDoc(
    collection(db, "users", userId, "activities"),
    entry
  );

  return { ...entry, id: ref.id };
}

/** Fetch recent activities (most recent first, default 20) */
export async function fetchRecentActivities(
  userId: string,
  max: number = 20
): Promise<ActivityEntry[]> {
  const q = query(
    collection(db, "users", userId, "activities"),
    orderBy("createdAt", "desc"),
    limit(max)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));
}

/** Fetch activities for a specific date range (for weekly stats) */
export async function fetchActivitiesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActivityEntry[]> {
  const q = query(
    collection(db, "users", userId, "activities"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));
}

/** Calculate weekly stats from activity list */
export function calculateWeeklyStats(activities: ActivityEntry[]) {
  if (activities.length === 0) {
    return {
      totalSessions: 0,
      totalMinutes: 0,
      avgDuration: 0,
      mostCommonType: null as ActivityType | null,
      activeDays: 0,
    };
  }

  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
  const uniqueDays = new Set(activities.map((a) => a.date)).size;

  // Most common activity type
  const counts: Record<string, number> = {};
  for (const a of activities) {
    counts[a.type] = (counts[a.type] || 0) + 1;
  }
  const mostCommonType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ActivityType;

  return {
    totalSessions: activities.length,
    totalMinutes,
    avgDuration: Math.round(totalMinutes / activities.length),
    mostCommonType,
    activeDays: uniqueDays,
  };
}
