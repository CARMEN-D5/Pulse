/**
 * Badge Service
 *
 * Bridges Firestore data with the pure badge unlock engine.
 * Gathers context, checks for new badges, and saves unlocks.
 */

import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { BadgeId, UnlockedBadge, BadgeCheckContext } from "../types/badge.types";
import { BadgeDefinition } from "../types/badge.types";
import { checkBadgeUnlocks } from "../engine/badgeUnlockEngine";
import { getBadgeById } from "../constants/badgeLibrary";
import { getWeekId } from "../../missions/services/missionService";
import { WeeklyMissionSet } from "../../missions/types/mission.types";

/**
 * Fetch all badges the user has already unlocked.
 */
export async function fetchUnlockedBadges(userId: string): Promise<UnlockedBadge[]> {
  const snap = await getDocs(collection(db, "users", userId, "badges"));
  const badges: UnlockedBadge[] = [];
  snap.forEach((doc) => {
    badges.push(doc.data() as UnlockedBadge);
  });
  return badges;
}

/**
 * Save a newly unlocked badge to Firestore.
 */
async function saveBadge(userId: string, badgeId: BadgeId): Promise<void> {
  const badge: UnlockedBadge = {
    id: badgeId,
    unlockedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", userId, "badges", badgeId), badge);
}

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get the Monday of the current ISO week */
function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Count check-in days this week (Mon–today).
 */
async function countWeeklyCheckIns(userId: string): Promise<number> {
  const monday = getWeekStartDate();
  const today = new Date();
  let count = 0;
  const current = new Date(monday);
  while (current <= today) {
    const snap = await getDoc(doc(db, "users", userId, "checkIns", formatDate(current)));
    if (snap.exists()) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Count total missions ever completed across all weeks.
 */
async function countTotalMissionsCompleted(userId: string): Promise<number> {
  const snap = await getDocs(collection(db, "users", userId, "weeklyMissions"));
  let total = 0;
  snap.forEach((doc) => {
    const data = doc.data() as WeeklyMissionSet;
    total += data.completedCount;
  });
  return total;
}

/**
 * Build the badge check context from Firestore data.
 */
async function buildContext(userId: string): Promise<BadgeCheckContext> {
  // User profile
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  const currentStreak = userData?.streakData?.currentStreak ?? 0;
  const balanceScore = userData?.latestBalanceScore ?? 0;
  const domainScores = (userData?.latestDomainScores ?? {}) as DomainScores;

  // Weekly missions
  const weekId = getWeekId();
  const missionSnap = await getDoc(doc(db, "users", userId, "weeklyMissions", weekId));
  let weeklyMissionsCompleted = 0;
  let weeklyMissionsTotal = 0;
  if (missionSnap.exists()) {
    const mData = missionSnap.data() as WeeklyMissionSet;
    weeklyMissionsCompleted = mData.completedCount;
    weeklyMissionsTotal = mData.totalCount;
  }

  // Weekly check-ins + total missions
  const [weeklyCheckInDays, totalMissionsCompleted] = await Promise.all([
    countWeeklyCheckIns(userId),
    countTotalMissionsCompleted(userId),
  ]);

  // Determine current engagement tier
  // Import weights to calculate on-the-fly
  const { ENGAGEMENT_WEIGHTS } = await import("../../../config/scoring");
  const checkInScore = Math.round((Math.min(weeklyCheckInDays, 7) / 7) * 100);
  const actionScore = weeklyMissionsTotal > 0
    ? Math.round((weeklyMissionsCompleted / weeklyMissionsTotal) * 100)
    : 0;
  const streakScore = currentStreak <= 0 ? 0
    : Math.round(Math.min(100, (Math.log(currentStreak + 1) / Math.log(31)) * 100));
  const engOverall = Math.round(
    ENGAGEMENT_WEIGHTS.checkInCompletion * checkInScore +
    ENGAGEMENT_WEIGHTS.actionCompletion * actionScore +
    ENGAGEMENT_WEIGHTS.streakStrength * streakScore
  );
  const currentTier = engOverall >= 85 ? "gold" : engOverall >= 60 ? "silver" : engOverall >= 30 ? "bronze" : "none";

  // Check if all domains >= 65
  const allDomainsAbove65 = DOMAIN_IDS.every((id) => (domainScores[id] ?? 0) >= 65);

  return {
    currentStreak,
    balanceScore,
    totalMissionsCompleted,
    weeklyMissionsCompleted,
    weeklyMissionsTotal,
    weeklyCheckInDays,
    currentTier,
    allDomainsAbove65,
  };
}

/**
 * Check for and unlock any new badges.
 * Returns the list of badge definitions that were newly unlocked.
 */
export async function checkAndUnlockBadges(userId: string): Promise<BadgeDefinition[]> {
  const [existingBadges, context] = await Promise.all([
    fetchUnlockedBadges(userId),
    buildContext(userId),
  ]);

  const alreadyUnlocked = existingBadges.map((b) => b.id);
  const newBadgeIds = checkBadgeUnlocks(context, alreadyUnlocked);

  if (newBadgeIds.length === 0) return [];

  // Save all new badges
  await Promise.all(newBadgeIds.map((id) => saveBadge(userId, id)));

  // Return full definitions for display
  return newBadgeIds
    .map((id) => getBadgeById(id))
    .filter((b): b is BadgeDefinition => b != null);
}
