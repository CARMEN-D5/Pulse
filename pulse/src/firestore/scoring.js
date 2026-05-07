// src/firestore/scoring.js
// Firestore operations for the scoring system.
// Collections used:
//   users/{uid}                        — profile doc (onboardingBaseline field added here)
//   users/{uid}/reflections/{id}       — daily reflection events
//   users/{uid}/actions/{id}           — action/behaviour events
//   users/{uid}/weeklyScores/{weekId}  — per-week snapshot (e.g. "2026-W18")

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../firebase';
import {
  DOMAINS,
  DOMAIN_KEYS,
  ratingToScore,
  computeDomainBreakdown,
  computeGlobalScores,
} from '../scoring/scoringEngine';

// ---------------------------------------------------------------------------
// Onboarding baseline
// ---------------------------------------------------------------------------

// Save a user's initial 1-5 self-ratings as a baseline on their user doc.
// ratings = { spirituality: 3, relationships: 4, productivity: 2, health: 5, finance: 3 }
export async function saveOnboardingBaseline(uid, ratings) {
  const baseline = {};
  for (const key of DOMAIN_KEYS) {
    baseline[key] = ratingToScore(ratings[key] ?? 3);
  }
  try {
    await updateDoc(doc(db, 'users', uid), {
      onboardingBaseline: baseline,
      onboardingCompletedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Reflection events
// ---------------------------------------------------------------------------

// Log a daily reflection for a domain. rating is 1-5.
export async function logReflection(uid, domainKey, rating) {
  try {
    await addDoc(collection(db, 'users', uid, 'reflections'), {
      domain: domainKey,
      rating,
      date: todayString(),
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Action events
// ---------------------------------------------------------------------------

// Log a user action. actionType must match a key in DOMAINS[domainKey].actions.
export async function logAction(uid, domainKey, actionType) {
  const action = DOMAINS[domainKey]?.actions?.[actionType];
  if (!action) return { ok: false, error: 'Unknown action type' };
  try {
    await addDoc(collection(db, 'users', uid, 'actions'), {
      domain: domainKey,
      actionType,
      points: action.points,
      date: todayString(),
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

// Compute the current scores for a user using their baseline + this week's events.
// userDoc should be the raw Firestore document data (from getUserDoc).
// Returns { domainScores, lifeStrength, evenness, balancedLifeScore } or null on error.
export async function computeCurrentScores(uid, userDoc) {
  const baseline = userDoc?.onboardingBaseline;
  if (!baseline) return null;

  // Bucket events by domain (empty defaults — used when subcollection queries fail)
  const reflByDomain = Object.fromEntries(DOMAIN_KEYS.map(k => [k, []]));
  const pointsByDomain = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]));
  const activeDaysByDomain = Object.fromEntries(DOMAIN_KEYS.map(k => [k, new Set()]));

  // Attempt to fetch this week's events. Falls back to baseline-only if
  // the subcollection rules haven't been deployed to Firebase yet.
  try {
    const weekStart = Timestamp.fromDate(getWeekStart());
    const [reflSnap, actSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'users', uid, 'reflections'),
        where('createdAt', '>=', weekStart),
      )),
      getDocs(query(
        collection(db, 'users', uid, 'actions'),
        where('createdAt', '>=', weekStart),
      )),
    ]);

    reflSnap.forEach(snap => {
      const d = snap.data();
      if (reflByDomain[d.domain]) reflByDomain[d.domain].push(d.rating);
    });

    actSnap.forEach(snap => {
      const d = snap.data();
      if (pointsByDomain[d.domain] !== undefined) {
        pointsByDomain[d.domain] += d.points;
        activeDaysByDomain[d.domain].add(d.date);
      }
    });
  } catch (err) {
    // Subcollection rules not yet deployed — scores will be baseline-only
    console.debug('[Pulse] scoring subcollection query failed, using baseline only', err?.code);
  }

  // Compute each domain score using the award-point delta approach:
  //   observed (0-100) → award (-2 to +2) → newScore = previousScore + award
  // We also keep the R/A/C breakdown around for the weekly snapshot.
  const domainScores = {};
  const domainBreakdowns = {};
  for (const key of DOMAIN_KEYS) {
    const previousScore = (userDoc.domainScores?.[key] ?? baseline[key]) ?? 60;
    const breakdown = computeDomainBreakdown({
      previousScore,
      reflections: reflByDomain[key],
      actionPoints: pointsByDomain[key],
      activeDays: activeDaysByDomain[key].size,
      weeklyTarget: DOMAINS[key].weeklyTarget,
    });
    domainScores[key] = breakdown.finalScore;
    domainBreakdowns[key] = breakdown;
  }

  const global = computeGlobalScores(domainScores);

  // Persist the new domain scores back to the user doc so the next
  // computation uses the updated previousScore instead of the original baseline.
  try {
    await updateDoc(doc(db, 'users', uid), {
      domainScores,
      lifeStrength: global.lifeStrength,
      evenness: global.evenness,
      balancedLifeScore: global.balancedLifeScore,
      scoresUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.debug('[Pulse] failed to persist domain scores', err?.code);
  }

  // Snapshot this week's scores into users/{uid}/weeklyScores/{weekId}.
  // The snapshot includes the R/A/C breakdown per domain so we can audit
  // later "why was productivity 25 last week?" — full math trail preserved.
  // setDoc with merge means re-running mid-week overwrites the same
  // weekly bucket rather than appending duplicates.
  try {
    const weekId = getWeekId();
    await setDoc(doc(db, 'users', uid, 'weeklyScores', weekId), {
      weekId,
      lifeStrength: global.lifeStrength,
      evenness: global.evenness,
      balancedLifeScore: global.balancedLifeScore,
      domains: domainBreakdowns, // { spirituality: { reflectionScore, actionScore, ... }, ... }
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.debug('[Pulse] failed to write weekly snapshot', err?.code);
  }

  return { domainScores, ...global };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

// ISO 8601 week id, e.g. "2026-W18". Sorts lexically in chronological order.
function getWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday in current week decides the year per ISO 8601
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
