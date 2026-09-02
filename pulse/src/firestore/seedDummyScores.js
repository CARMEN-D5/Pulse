// src/firestore/seedDummyScores.js
// Seeds Firestore with simulated weekly score data using the real scoring
// engine. Supports multiple user profiles and time periods (2, 4, 8 weeks).

import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DOMAINS,
  DOMAIN_KEYS,
  ratingToScore,
  computeDomainBreakdown,
  computeGlobalScores,
} from '../scoring/scoringEngine';

// ---------------------------------------------------------------------------
// ISO week helper
// ---------------------------------------------------------------------------

function getWeekId(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// User activity profiles
// ---------------------------------------------------------------------------

function dedicatedWeek() {
  return {
    spirituality:  { reflections: [4, 5, 4, 5, 4, 4, 5], actionPoints: 200, activeDays: 6 },
    relationships: { reflections: [4, 4, 5, 4, 4, 5, 4], actionPoints: 180, activeDays: 5 },
    productivity:  { reflections: [4, 5, 5, 4, 5, 4, 4], actionPoints: 225, activeDays: 6 },
    health:        { reflections: [5, 4, 4, 5, 4, 5, 4], actionPoints: 300, activeDays: 7 },
    finance:       { reflections: [4, 4, 3, 4, 4, 5, 4], actionPoints: 175, activeDays: 5 },
  };
}

function casualWeek(seed = 0) {
  const patterns = [
    {
      spirituality:  { reflections: [3, 3],     actionPoints: 50,  activeDays: 2 },
      relationships: { reflections: [4, 3],     actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [3],        actionPoints: 75,  activeDays: 3 },
      health:        { reflections: [2, 3],     actionPoints: 100, activeDays: 2 },
      finance:       { reflections: [3],        actionPoints: 25,  activeDays: 1 },
    },
    {
      spirituality:  { reflections: [3, 4],     actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3],        actionPoints: 50,  activeDays: 1 },
      productivity:  { reflections: [2, 3],     actionPoints: 50,  activeDays: 2 },
      health:        { reflections: [3, 3, 4],  actionPoints: 150, activeDays: 3 },
      finance:       { reflections: [],         actionPoints: 25,  activeDays: 1 },
    },
    {
      spirituality:  { reflections: [4],        actionPoints: 50,  activeDays: 1 },
      relationships: { reflections: [3, 4, 3],  actionPoints: 100, activeDays: 3 },
      productivity:  { reflections: [3, 3],     actionPoints: 100, activeDays: 3 },
      health:        { reflections: [3],        actionPoints: 50,  activeDays: 1 },
      finance:       { reflections: [2, 3],     actionPoints: 50,  activeDays: 2 },
    },
  ];
  return patterns[seed % patterns.length];
}

function improvingWeek(weekNum) {
  const t = Math.min(1, (weekNum - 1) / 7);
  const reflRating = Math.round(2 + t * 3);
  const numRefl = Math.round(1 + t * 6);
  const actMult = 0.1 + t * 0.9;
  const days = Math.round(1 + t * 6);
  const reflections = Array(numRefl).fill(Math.min(5, reflRating));
  return {
    spirituality:  { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
    relationships: { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
    productivity:  { reflections: [...reflections], actionPoints: Math.round(250 * actMult), activeDays: days },
    health:        { reflections: [...reflections], actionPoints: Math.round(300 * actMult), activeDays: days },
    finance:       { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
  };
}

function decliningWeek(weekNum) {
  const t = Math.min(1, (weekNum - 1) / 7);
  const reflRating = Math.round(5 - t * 3);
  const numRefl = Math.max(0, Math.round(7 - t * 7));
  const actMult = 1 - t * 0.9;
  const days = Math.max(0, Math.round(7 - t * 7));
  const reflections = Array(numRefl).fill(Math.max(1, reflRating));
  return {
    spirituality:  { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
    relationships: { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
    productivity:  { reflections: [...reflections], actionPoints: Math.round(250 * actMult), activeDays: days },
    health:        { reflections: [...reflections], actionPoints: Math.round(300 * actMult), activeDays: days },
    finance:       { reflections: [...reflections], actionPoints: Math.round(200 * actMult), activeDays: days },
  };
}

function unbalancedWeek() {
  return {
    spirituality:  { reflections: [],          actionPoints: 0,   activeDays: 0 },
    relationships: { reflections: [2],         actionPoints: 0,   activeDays: 0 },
    productivity:  { reflections: [5, 5, 4, 5, 5, 4, 5], actionPoints: 250, activeDays: 7 },
    health:        { reflections: [5, 4, 5, 5, 4, 5, 4], actionPoints: 300, activeDays: 7 },
    finance:       { reflections: [3],         actionPoints: 25,  activeDays: 1 },
  };
}

function journeyWeek(weekNum) {
  const JOURNEY = [
    // Week 1-3: Getting started
    {
      spirituality:  { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      relationships: { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2],       actionPoints: 50,  activeDays: 2 },
      health:        { reflections: [3],       actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [2],       actionPoints: 25,  activeDays: 1 },
    },
    {
      spirituality:  { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3, 4],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [3, 3],    actionPoints: 75,  activeDays: 3 },
      health:        { reflections: [3, 4],    actionPoints: 150, activeDays: 4 },
      finance:       { reflections: [3],       actionPoints: 50,  activeDays: 2 },
    },
    {
      spirituality:  { reflections: [4, 3, 4], actionPoints: 100, activeDays: 4 },
      relationships: { reflections: [3, 4],    actionPoints: 100, activeDays: 3 },
      productivity:  { reflections: [3, 3, 4], actionPoints: 100, activeDays: 4 },
      health:        { reflections: [4, 4],    actionPoints: 150, activeDays: 4 },
      finance:       { reflections: [3, 3],    actionPoints: 75,  activeDays: 3 },
    },
    // Week 4-6: Building habits → peak
    {
      spirituality:  { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4],    actionPoints: 100, activeDays: 4 },
      productivity:  { reflections: [4, 3, 4], actionPoints: 150, activeDays: 5 },
      health:        { reflections: [4, 4, 4], actionPoints: 200, activeDays: 5 },
      finance:       { reflections: [3, 4],    actionPoints: 100, activeDays: 3 },
    },
    {
      spirituality:  { reflections: [4, 4, 5], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 4, 4], actionPoints: 200, activeDays: 6 },
      health:        { reflections: [4, 5, 4], actionPoints: 250, activeDays: 6 },
      finance:       { reflections: [4, 4],    actionPoints: 150, activeDays: 4 },
    },
    {
      spirituality:  { reflections: [5, 4, 5], actionPoints: 200, activeDays: 6 },
      relationships: { reflections: [4, 5, 4], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 5, 4], actionPoints: 200, activeDays: 6 },
      health:        { reflections: [5, 5, 4], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
    },
    // Week 7-8: Slump
    {
      spirituality:  { reflections: [4, 3],    actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3, 3],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2],       actionPoints: 25,  activeDays: 1 },
      health:        { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [],        actionPoints: 0,   activeDays: 0 },
    },
    {
      spirituality:  { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      relationships: { reflections: [2, 3],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2, 2],    actionPoints: 50,  activeDays: 2 },
      health:        { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [2],       actionPoints: 25,  activeDays: 1 },
    },
  ];
  const idx = Math.min(weekNum - 1, JOURNEY.length - 1);
  return JOURNEY[idx];
}

// ---------------------------------------------------------------------------
// Profile registry
// ---------------------------------------------------------------------------

export const SEED_PROFILES = {
  dedicated:  { label: 'Dedicated',  generator: () => dedicatedWeek() },
  casual:     { label: 'Casual',     generator: (w) => casualWeek(w) },
  improving:  { label: 'Improving',  generator: (w) => improvingWeek(w) },
  declining:  { label: 'Declining',  generator: (w) => decliningWeek(w) },
  unbalanced: { label: 'Unbalanced', generator: () => unbalancedWeek() },
  journey:    { label: 'Journey',    generator: (w) => journeyWeek(w) },
};

export const SEED_PERIODS = {
  2:  { label: '14 Days',  weeks: 2 },
  4:  { label: '1 Month',  weeks: 4 },
  8:  { label: '2 Months', weeks: 8 },
};

// ---------------------------------------------------------------------------
// Simulation engine (same logic as scoringSimulation.test.js)
// ---------------------------------------------------------------------------

function runSimulation(numWeeks, generatorFn) {
  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };
  const currentScores = {};
  const lastReflectionScores = {};
  for (const key of DOMAIN_KEYS) {
    currentScores[key] = ratingToScore(baseline[key]);
  }

  const history = [];

  for (let w = 0; w < numWeeks; w++) {
    const weekActivity = generatorFn(w + 1);
    const weekStartScores = { ...currentScores };
    const breakdowns = {};

    for (const key of DOMAIN_KEYS) {
      const activity = weekActivity[key] || {};
      const breakdown = computeDomainBreakdown({
        previousScore: weekStartScores[key],
        previousReflectionScore: lastReflectionScores[key],
        reflections: activity.reflections || [],
        actionPoints: activity.actionPoints || 0,
        activeDays: activity.activeDays || 0,
        weeklyTarget: DOMAINS[key].weeklyTarget,
      });
      currentScores[key] = breakdown.finalScore;
      breakdowns[key] = breakdown;
      if ((activity.reflections || []).length > 0) {
        lastReflectionScores[key] = breakdown.reflectionScore;
      }
    }

    const global = computeGlobalScores(currentScores);
    history.push({
      week: w + 1,
      domainScores: { ...currentScores },
      breakdowns,
      ...global,
    });
  }

  return history;
}

// ---------------------------------------------------------------------------
// Firestore seeder
// ---------------------------------------------------------------------------

/**
 * Seed weekly scores into Firestore using the real scoring engine.
 *
 * @param {string} uid - Firebase user id
 * @param {string} profileKey - Key from SEED_PROFILES (default: 'journey')
 * @param {number} numWeeks - Number of weeks to simulate (default: 8)
 */
export async function seedDummyWeeklyScores(uid, profileKey = 'journey', numWeeks = 8) {
  const profile = SEED_PROFILES[profileKey] || SEED_PROFILES.journey;
  const history = runSimulation(numWeeks, profile.generator);

  const now = new Date();
  const weekDates = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weekDates.push(d);
  }

  const writes = history.map((entry, i) => {
    const weekId = getWeekId(weekDates[i]);
    const weekDoc = {
      weekId,
      lifeStrength: Math.round(entry.lifeStrength * 10) / 10,
      evenness: Math.round(entry.evenness * 10) / 10,
      balancedLifeScore: Math.round(entry.balancedLifeScore * 10) / 10,
      domains: {},
      updatedAt: Timestamp.fromDate(weekDates[i]),
    };

    for (const key of DOMAIN_KEYS) {
      const b = entry.breakdowns[key];
      weekDoc.domains[key] = {
        reflectionScore: Math.round(b.reflectionScore * 10) / 10,
        actionScore: Math.round(b.actionScore * 10) / 10,
        consistencyScore: Math.round(b.consistencyScore * 10) / 10,
        observed: Math.round(b.observed * 10) / 10,
        awardPoints: Math.round(b.awardPoints * 100) / 100,
        finalScore: Math.round(entry.domainScores[key] * 10) / 10,
      };
    }

    return setDoc(
      doc(db, 'users', uid, 'weeklyScores', weekId),
      weekDoc,
      { merge: true }
    );
  });

  // Also update the user doc with the latest scores so the dashboard
  // reflects them immediately without needing computeCurrentScores
  const lastEntry = history[history.length - 1];
  const domainScores = {};
  for (const key of DOMAIN_KEYS) {
    domainScores[key] = Math.round(lastEntry.domainScores[key] * 10) / 10;
  }

  writes.push(
    updateDoc(doc(db, 'users', uid), {
      domainScores,
      lifeStrength: Math.round(lastEntry.lifeStrength * 10) / 10,
      evenness: Math.round(lastEntry.evenness * 10) / 10,
      balancedLifeScore: Math.round(lastEntry.balancedLifeScore * 10) / 10,
      scoresUpdatedAt: serverTimestamp(),
    })
  );

  await Promise.all(writes);

  return {
    ok: true,
    profile: profile.label,
    count: history.length,
    weeks: weekDates.map(d => getWeekId(d)),
  };
}
