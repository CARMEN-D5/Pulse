/**
 * Weekly Review Service
 *
 * Gathers all data for a given week (Mon–Sun) and produces a
 * WeeklyReviewData summary for the review screen.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DOMAIN_IDS, DomainId, DOMAINS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { WeeklyMissionSet, AssignedMission } from "../../missions/types/mission.types";
import { MoodDataPoint, MoodEntry } from "../../mood/types/mood.types";
import { fetchWeeklyEngagement } from "../../scoring/services/engagementService";
import { getWeekId } from "../../missions/services/missionService";
import {
  WeeklyReviewData,
  WeekSummary,
  ReviewDaySnapshot,
} from "../types/weeklyReview.types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get Monday of the current ISO week */
function getWeekStartDate(referenceDate?: Date): Date {
  const d = referenceDate ? new Date(referenceDate) : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Generate a human-readable week label like "Mar 17 – Mar 23" */
function getWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** Fetch daily snapshots for Mon–Sun of the week */
async function fetchWeekSnapshots(
  userId: string,
  monday: Date
): Promise<ReviewDaySnapshot[]> {
  const snapshots: ReviewDaySnapshot[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    if (date > today) break;

    const dateId = formatDate(date);
    const snap = await getDoc(doc(db, "users", userId, "dailySnapshots", dateId));
    if (snap.exists()) {
      const data = snap.data();
      snapshots.push({
        date: dateId,
        dayLabel: DAY_LABELS[i],
        balanceScore: data.balanceScore,
        domainScores: data.domainScores,
        streakCount: data.streakCount ?? 0,
      });
    }
  }

  return snapshots;
}

/** Fetch mood entries for the week */
async function fetchWeekMoods(
  userId: string,
  monday: Date
): Promise<MoodDataPoint[]> {
  const moods: MoodDataPoint[] = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    if (date > today) break;

    const dateId = formatDate(date);
    const snap = await getDoc(doc(db, "users", userId, "moods", dateId));
    if (snap.exists()) {
      const data = snap.data() as MoodEntry;
      moods.push({
        date: dateId,
        level: data.level,
        emoji: data.emoji,
        label: data.label,
        note: data.note,
      });
    }
  }

  return moods;
}

/** Fetch missions for the week */
async function fetchWeekMissions(userId: string, weekId: string) {
  const snap = await getDoc(doc(db, "users", userId, "weeklyMissions", weekId));
  if (!snap.exists()) {
    return { completed: [], skipped: [], pending: [], totalCount: 0, completedCount: 0 };
  }

  const data = snap.data() as WeeklyMissionSet;
  return {
    completed: data.missions.filter((m) => m.status === "completed"),
    skipped: data.missions.filter((m) => m.status === "skipped"),
    pending: data.missions.filter((m) => m.status === "pending"),
    totalCount: data.totalCount,
    completedCount: data.completedCount,
  };
}

/** Calculate the week summary from daily snapshots */
function calculateSummary(snapshots: ReviewDaySnapshot[]): WeekSummary {
  if (snapshots.length === 0) {
    return {
      checkInCount: 0,
      avgBalanceScore: 0,
      bestScore: 0,
      bestDay: "",
      worstScore: 0,
      mostImprovedDomain: null,
      mostImprovedAmount: 0,
      needsAttentionDomain: null,
      needsAttentionAmount: 0,
      streakCount: 0,
    };
  }

  const scores = snapshots.map((s) => s.balanceScore);
  const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  const bestIdx = scores.indexOf(Math.max(...scores));
  const worstIdx = scores.indexOf(Math.min(...scores));

  // Domain trends: compare first and last snapshot
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  let mostImprovedDomain: DomainId | null = null;
  let mostImprovedAmount = 0;
  let needsAttentionDomain: DomainId | null = null;
  let needsAttentionAmount = 0;

  for (const id of DOMAIN_IDS) {
    const diff = (last.domainScores[id] ?? 0) - (first.domainScores[id] ?? 0);
    if (diff > mostImprovedAmount) {
      mostImprovedAmount = Math.round(diff * 10) / 10;
      mostImprovedDomain = id;
    }
    if (diff < needsAttentionAmount) {
      needsAttentionAmount = Math.round(diff * 10) / 10;
      needsAttentionDomain = id;
    }
  }

  return {
    checkInCount: snapshots.length,
    avgBalanceScore: avg,
    bestScore: scores[bestIdx],
    bestDay: snapshots[bestIdx].dayLabel,
    worstScore: scores[worstIdx],
    mostImprovedDomain,
    mostImprovedAmount,
    needsAttentionDomain,
    needsAttentionAmount,
    streakCount: last.streakCount,
  };
}

/** Generate a motivational insight based on the week's data */
function generateInsight(summary: WeekSummary, missionCompletedCount: number, missionTotal: number): string {
  const parts: string[] = [];

  // Check-in consistency
  if (summary.checkInCount >= 7) {
    parts.push("Perfect check-in week! Your consistency is building real momentum.");
  } else if (summary.checkInCount >= 5) {
    parts.push(`You checked in ${summary.checkInCount}/7 days — great consistency!`);
  } else if (summary.checkInCount >= 3) {
    parts.push(`${summary.checkInCount} check-ins this week. Try to build the habit a bit more next week.`);
  } else if (summary.checkInCount > 0) {
    parts.push("Every check-in counts. Aim for at least 3 days next week to build momentum.");
  } else {
    parts.push("No check-ins this week. Start small — even one check-in per day makes a difference!");
  }

  // Domain improvement
  if (summary.mostImprovedDomain && summary.mostImprovedAmount > 0) {
    const domain = DOMAINS[summary.mostImprovedDomain];
    parts.push(`${domain.label} improved by +${summary.mostImprovedAmount} — keep it up!`);
  }

  // Missions
  if (missionTotal > 0) {
    if (missionCompletedCount === missionTotal) {
      parts.push("All missions completed — outstanding commitment!");
    } else if (missionCompletedCount > 0) {
      parts.push(`${missionCompletedCount}/${missionTotal} missions done. Every action builds your balance.`);
    }
  }

  return parts.join(" ");
}

/**
 * Fetch all data for the Weekly Review screen.
 * Defaults to the current week if no weekId is provided.
 */
export async function fetchWeeklyReviewData(
  userId: string,
  weekId?: string
): Promise<WeeklyReviewData> {
  const resolvedWeekId = weekId ?? getWeekId();
  const monday = getWeekStartDate();
  const weekLabel = getWeekLabel(monday);

  const [engagement, missions, snapshots, moods] = await Promise.all([
    fetchWeeklyEngagement(userId),
    fetchWeekMissions(userId, resolvedWeekId),
    fetchWeekSnapshots(userId, monday),
    fetchWeekMoods(userId, monday),
  ]);

  const summary = calculateSummary(snapshots);
  const insight = generateInsight(summary, missions.completedCount, missions.totalCount);

  return {
    weekId: resolvedWeekId,
    weekLabel,
    engagement,
    missions,
    dailySnapshots: snapshots,
    summary,
    moods,
    insight,
  };
}
