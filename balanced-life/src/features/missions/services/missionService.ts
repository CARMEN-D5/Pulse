/**
 * Mission Service
 *
 * Generates weekly micro actions targeting the user's weakest domains.
 * Missions are stored in Firestore and regenerated each new week.
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { MISSION_LIBRARY, getMissionsByDomain } from "../constants/missionLibrary";
import {
  AssignedMission,
  WeeklyMissionSet,
  MissionStatus,
} from "../types/mission.types";

/** Number of missions to assign per week */
const MISSIONS_PER_WEEK = 3;

/** Number of weakest domains to target */
const TARGET_DOMAIN_COUNT = 2;

/** Get the ISO week ID for a date (e.g. "2026-W12") */
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Identify the weakest N domains from current scores */
function getWeakestDomains(
  domainScores: DomainScores,
  count: number
): DomainId[] {
  return [...DOMAIN_IDS]
    .sort((a, b) => (domainScores[a] ?? 0) - (domainScores[b] ?? 0))
    .slice(0, count);
}

/** Randomly pick N items from an array (Fisher-Yates) */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Generate this week's missions based on the user's weakest domains.
 * Avoids repeating missions from the previous week.
 */
function generateMissions(
  targetDomains: DomainId[],
  previousMissionIds: string[]
): AssignedMission[] {
  const missions: AssignedMission[] = [];

  // Distribute missions across target domains
  // e.g., 3 missions across 2 domains = 2 from weakest, 1 from second weakest
  const missionsPerDomain: number[] = [];
  let remaining = MISSIONS_PER_WEEK;
  for (let i = 0; i < targetDomains.length; i++) {
    const count = i === 0
      ? Math.ceil(remaining / (targetDomains.length - i))
      : remaining;
    missionsPerDomain.push(Math.min(count, remaining));
    remaining -= missionsPerDomain[i];
  }

  for (let i = 0; i < targetDomains.length; i++) {
    const domain = targetDomains[i];
    const count = missionsPerDomain[i];
    if (count <= 0) continue;

    // Get available missions (exclude previous week's)
    const available = getMissionsByDomain(domain).filter(
      (m) => !previousMissionIds.includes(m.id)
    );

    // Fall back to all if not enough fresh ones
    const pool = available.length >= count ? available : getMissionsByDomain(domain);
    const selected = pickRandom(pool, count);

    for (const template of selected) {
      missions.push({
        id: `${getWeekId()}-${template.id}`,
        templateId: template.id,
        domain: template.domain,
        title: template.title,
        description: template.description,
        estimatedMinutes: template.estimatedMinutes,
        status: "pending",
      });
    }
  }

  return missions;
}

/**
 * Get or create this week's missions for a user.
 * If missions already exist for the current week, returns them.
 * Otherwise generates new ones based on the user's domain scores.
 */
export async function getOrCreateWeeklyMissions(
  userId: string
): Promise<WeeklyMissionSet> {
  const weekId = getWeekId();
  const missionDocRef = doc(db, "users", userId, "weeklyMissions", weekId);

  // Check if this week's missions already exist
  const existing = await getDoc(missionDocRef);
  if (existing.exists()) {
    return existing.data() as WeeklyMissionSet;
  }

  // Get user's current domain scores
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  const domainScores = (userData?.latestDomainScores ?? {}) as DomainScores;

  // Get previous week's mission IDs to avoid repeats
  const prevWeek = getPreviousWeekId();
  const prevDoc = await getDoc(doc(db, "users", userId, "weeklyMissions", prevWeek));
  const previousMissionIds = prevDoc.exists()
    ? (prevDoc.data() as WeeklyMissionSet).missions.map((m) => m.templateId)
    : [];

  // Identify weakest domains and generate missions
  const targetDomains = getWeakestDomains(domainScores, TARGET_DOMAIN_COUNT);
  const missions = generateMissions(targetDomains, previousMissionIds);

  const missionSet: WeeklyMissionSet = {
    weekId,
    generatedAt: new Date().toISOString(),
    targetDomains,
    missions,
    completedCount: 0,
    totalCount: missions.length,
  };

  // Save to Firestore
  await setDoc(missionDocRef, missionSet);

  return missionSet;
}

/** Get the previous week's ID */
function getPreviousWeekId(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getWeekId(d);
}

/**
 * Update a mission's status (complete or skip).
 */
export async function updateMissionStatus(
  userId: string,
  weekId: string,
  missionId: string,
  status: MissionStatus
): Promise<WeeklyMissionSet> {
  const missionDocRef = doc(db, "users", userId, "weeklyMissions", weekId);
  const snap = await getDoc(missionDocRef);

  if (!snap.exists()) {
    throw new Error("Mission set not found");
  }

  const missionSet = snap.data() as WeeklyMissionSet;
  const updated = missionSet.missions.map((m) => {
    if (m.id === missionId) {
      return {
        ...m,
        status,
        completedAt: status === "completed" ? new Date().toISOString() : undefined,
      };
    }
    return m;
  });

  const completedCount = updated.filter((m) => m.status === "completed").length;

  const updatedSet: WeeklyMissionSet = {
    ...missionSet,
    missions: updated,
    completedCount,
  };

  await setDoc(missionDocRef, updatedSet);

  return updatedSet;
}
