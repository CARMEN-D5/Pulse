// src/firestore/scoring.js
// Firestore operations for the scoring system.
// Collections used:
//   users/{uid}                        — profile doc (onboardingBaseline field added here)
//   users/{uid}/reflections/{id}       — daily reflection events
//   users/{uid}/actions/{id}           — action/behaviour events

import {
  doc,
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
  computeDomainScore,
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
  const domainScores = {};
  for (const key of DOMAIN_KEYS) {
    const previousScore = (userDoc.domainScores?.[key] ?? baseline[key]) ?? 60;
    domainScores[key] = computeDomainScore({
      previousScore,
      reflections: reflByDomain[key],
      actionPoints: pointsByDomain[key],
      activeDays: activeDaysByDomain[key].size,
      weeklyTarget: DOMAINS[key].weeklyTarget,
    });
  }

  const global = computeGlobalScores(domainScores);

  // ✅ FIX: persist the new domain scores back to the user doc so the next
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
