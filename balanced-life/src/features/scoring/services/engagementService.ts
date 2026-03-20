/**
 * Weekly Engagement Service
 *
 * Gathers this week's engagement data from Firestore and calculates
 * the Weekly Engagement Score. Resets every Monday — clean slate.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { WeeklyEngagement } from "../types/scoring.types";
import {
  calculateWeeklyEngagement,
  WeeklyEngagementInput,
  FeatureKey,
} from "../engine/engagementScore";
import { getWeekId } from "../../missions/services/missionService";
import { WeeklyMissionSet } from "../../missions/types/mission.types";

/**
 * Get the Monday of the current ISO week.
 */
function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Monday = start of week
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get number of days remaining in the current week (Mon-Sun).
 * Sunday = 0 remaining, Monday = 6 remaining.
 */
function getDaysRemaining(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  if (day === 0) return 0; // Sunday = last day
  return 7 - day; // Mon=6, Tue=5, ..., Sat=1
}

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Count check-ins only within the current week (Mon–Sun).
 */
async function countCheckInsThisWeek(userId: string): Promise<number> {
  const monday = getWeekStartDate();
  const today = new Date();
  let count = 0;

  // Iterate from Monday to today
  const current = new Date(monday);
  while (current <= today) {
    const dateId = formatDate(current);
    const snap = await getDoc(doc(db, "users", userId, "checkIns", dateId));
    if (snap.exists()) count++;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get this week's mission completion stats.
 */
async function getMissionStats(userId: string): Promise<{ completed: number; total: number }> {
  const weekId = getWeekId();
  const snap = await getDoc(doc(db, "users", userId, "weeklyMissions", weekId));

  if (!snap.exists()) {
    return { completed: 0, total: 0 };
  }

  const data = snap.data() as WeeklyMissionSet;
  return {
    completed: data.completedCount,
    total: data.totalCount,
  };
}

/**
 * Detect which features the user has engaged with THIS WEEK.
 * Only checks from Monday to today.
 */
async function detectFeaturesUsedThisWeek(userId: string): Promise<FeatureKey[]> {
  const features: FeatureKey[] = [];
  const monday = getWeekStartDate();
  const today = new Date();

  // Check-in: any check-in this week?
  const current = new Date(monday);
  let hasCheckIn = false;
  while (current <= today) {
    const snap = await getDoc(doc(db, "users", userId, "checkIns", formatDate(current)));
    if (snap.exists()) {
      hasCheckIn = true;
      break;
    }
    current.setDate(current.getDate() + 1);
  }
  if (hasCheckIn) features.push("checkIn");

  // Missions: any interaction this week?
  const weekId = getWeekId();
  const missionSnap = await getDoc(doc(db, "users", userId, "weeklyMissions", weekId));
  if (missionSnap.exists()) {
    const mData = missionSnap.data() as WeeklyMissionSet;
    if (mData.completedCount > 0 || mData.missions.some((m) => m.status !== "pending")) {
      features.push("missions");
    }
  }

  // Mood: any mood entry this week?
  const moodCurrent = new Date(monday);
  let hasMood = false;
  while (moodCurrent <= today) {
    const moodSnap = await getDoc(doc(db, "users", userId, "moods", formatDate(moodCurrent)));
    if (moodSnap.exists()) {
      hasMood = true;
      break;
    }
    moodCurrent.setDate(moodCurrent.getDate() + 1);
  }
  if (hasMood) features.push("mood");

  // Future features — add detection when implemented:
  // journal, budget, todos, activity, friends

  return features;
}

/**
 * Calculate the Weekly Engagement Score for a user.
 * All data is scoped to the current Mon–Sun week.
 */
export async function fetchWeeklyEngagement(userId: string): Promise<WeeklyEngagement> {
  const weekId = getWeekId();

  const [checkInDaysThisWeek, missionStats, featuresUsed] = await Promise.all([
    countCheckInsThisWeek(userId),
    getMissionStats(userId),
    detectFeaturesUsedThisWeek(userId),
  ]);

  // Get current streak from user profile
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  const currentStreak = userData?.streakData?.currentStreak ?? 0;

  const input: WeeklyEngagementInput = {
    weekId,
    checkInDaysThisWeek,
    missionsCompleted: missionStats.completed,
    missionsTotal: missionStats.total,
    currentStreak,
    featuresUsed,
    daysRemaining: getDaysRemaining(),
  };

  return calculateWeeklyEngagement(input);
}
