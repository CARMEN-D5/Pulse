import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { calculateBalanceScore } from "../../scoring/engine/balanceScore";
import { MAX_WEEKLY_TOTAL, ROLLING_DAYS } from "../constants/checkInOptions";

export type CheckInAnswers = Record<DomainId, number>;

export interface CheckInResult {
  domainScores: DomainScores;
  balanceScore: number;
  previousBalanceScore: number;
  streakCount: number;
}

/** Get today's date as YYYY-MM-DD */
function todayId(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get date string N days ago */
function daysAgoId(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Check if user already checked in today */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const docRef = doc(db, "users", userId, "checkIns", todayId());
  const snap = await getDoc(docRef);
  return snap.exists();
}

/** Save check-in and recalculate scores */
export async function saveCheckIn(
  userId: string,
  answers: CheckInAnswers
): Promise<CheckInResult> {
  const today = todayId();

  // 1. Save today's check-in
  await setDoc(doc(db, "users", userId, "checkIns", today), {
    answers,
    date: today,
    createdAt: Timestamp.now(),
  });

  // 2. Fetch last 7 days of check-ins (including today)
  const weekTotals: Record<DomainId, number> = {} as Record<DomainId, number>;
  let daysCheckedIn = 0;

  for (const id of DOMAIN_IDS) {
    weekTotals[id] = 0;
  }

  for (let i = 0; i < ROLLING_DAYS; i++) {
    const dateId = daysAgoId(i);
    const snap = await getDoc(doc(db, "users", userId, "checkIns", dateId));
    if (snap.exists()) {
      const data = snap.data();
      daysCheckedIn++;
      for (const id of DOMAIN_IDS) {
        weekTotals[id] += data.answers[id] ?? 0;
      }
    }
  }

  // 3. Calculate domain scores using rolling 7-day average
  // Formula: (weekly total / 14) × 10, scaled to 0-100
  const domainScores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const rawScore = (weekTotals[id] / MAX_WEEKLY_TOTAL) * 10;
    domainScores[id] = Math.round(rawScore * 10); // 0-10 → 0-100
  }

  // 4. Get previous scores for comparison and blend with assessment
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  const previousBalanceScore = userData?.latestBalanceScore ?? 0;
  const assessmentScores = userData?.latestDomainScores as DomainScores | undefined;

  // 5. Blend: if fewer than 7 days of check-ins, weight assessment scores
  if (assessmentScores && daysCheckedIn < ROLLING_DAYS) {
    const checkInWeight = daysCheckedIn / ROLLING_DAYS;
    const assessmentWeight = 1 - checkInWeight;
    for (const id of DOMAIN_IDS) {
      domainScores[id] = Math.round(
        domainScores[id] * checkInWeight + assessmentScores[id] * assessmentWeight
      );
    }
  }

  // 6. Calculate balance score
  const result = calculateBalanceScore(domainScores);

  // 7. Update streak
  const yesterdaySnap = await getDoc(
    doc(db, "users", userId, "checkIns", daysAgoId(1))
  );
  const previousStreak = userData?.streakData?.currentStreak ?? 0;
  const streakCount = yesterdaySnap.exists() ? previousStreak + 1 : 1;

  // 8. Save updated scores to user profile
  await setDoc(
    doc(db, "users", userId),
    {
      latestDomainScores: result.domainScores,
      latestBalanceScore: result.balanceScore,
      lastCheckInDate: today,
      streakData: {
        currentStreak: streakCount,
        lastCheckInDate: today,
      },
    },
    { merge: true }
  );

  return {
    domainScores: result.domainScores,
    balanceScore: result.balanceScore,
    previousBalanceScore,
    streakCount,
  };
}
