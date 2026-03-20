/**
 * Daily Check-In Service
 *
 * Flow:
 * 1. User answers 5 questions (1 per domain, 1-5 scale)
 * 2. Each answer maps to 0-100 signal via ((value-1)/4)*100
 * 3. Signal updates domain score via daily EMA: new = α×signal + (1-α)×previous
 * 4. Movement capped at ±3 points per domain per day
 * 5. Balance Score recalculated via geometric mean
 * 6. Streak updated
 * 7. Results saved to Firestore
 */

import {
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";
import { calculateBalanceScore } from "../../scoring/engine/balanceScore";
import { dailyEmaStep, buildDailySignal } from "../../scoring/engine/emaCalculator";
import { checkInValueToScore, CheckInValue } from "../constants/checkInOptions";

export type CheckInAnswers = Record<DomainId, CheckInValue>;

export interface CheckInResult {
  domainScores: DomainScores;
  previousDomainScores: DomainScores;
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

/** Save check-in and recalculate scores using daily EMA */
export async function saveCheckIn(
  userId: string,
  answers: CheckInAnswers
): Promise<CheckInResult> {
  const today = todayId();

  // 1. Save today's raw check-in answers
  await setDoc(doc(db, "users", userId, "checkIns", today), {
    answers,
    date: today,
    createdAt: Timestamp.now(),
  });

  // 2. Get previous scores from user profile
  const userDoc = await getDoc(doc(db, "users", userId));
  const userData = userDoc.data();
  const previousDomainScores = (userData?.latestDomainScores ?? {}) as DomainScores;
  const previousBalanceScore = userData?.latestBalanceScore ?? 0;

  // 3. Convert check-in answers to 0-100 signals and apply daily EMA
  const newDomainScores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const checkInSignal = checkInValueToScore(answers[id]);
    const todaySignal = buildDailySignal(checkInSignal);
    const previousScore = previousDomainScores[id] ?? 50; // default 50 if no history

    newDomainScores[id] = dailyEmaStep(todaySignal, previousScore);
  }

  // 4. Calculate new Balance Score using geometric mean
  const result = calculateBalanceScore(newDomainScores);

  // 5. Update streak
  const yesterdaySnap = await getDoc(
    doc(db, "users", userId, "checkIns", daysAgoId(1))
  );
  const previousStreak = userData?.streakData?.currentStreak ?? 0;
  const streakCount = yesterdaySnap.exists() ? previousStreak + 1 : 1;

  // 6. Save updated scores to user profile
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

  // 7. Save daily snapshot for trend charts
  await setDoc(doc(db, "users", userId, "dailySnapshots", today), {
    date: today,
    domainScores: result.domainScores,
    balanceScore: result.balanceScore,
    streakCount,
    createdAt: Timestamp.now(),
  });

  return {
    domainScores: result.domainScores,
    previousDomainScores,
    balanceScore: result.balanceScore,
    previousBalanceScore,
    streakCount,
  };
}
