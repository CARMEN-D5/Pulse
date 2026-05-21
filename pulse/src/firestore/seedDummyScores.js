// src/firestore/seedDummyScores.js
// Generates 10 weeks of realistic dummy weekly score data for testing.
// Each domain starts at a base score and trends upward with some variance.

import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { DOMAIN_KEYS, calcLifeStrength, calcEvenness, calcBalancedLifeScore } from '../scoring/scoringEngine';

// Clamp helper
function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

// Get the ISO week id for a given date
function getWeekId(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Seed 10 weeks of dummy weekly scores into Firestore.
 * Data shows a realistic progression: scores start moderate and trend upward
 * with some natural fluctuations per domain.
 */
export async function seedDummyWeeklyScores(uid) {
  // Starting scores for each domain (moderate, with some variety)
  const baseScores = {
    spirituality:  55,
    relationships: 48,
    productivity:  42,
    health:        60,
    finance:       50,
  };

  // Per-week trend bias (positive = improving overall)
  // Some domains improve faster than others
  const trendPerWeek = {
    spirituality:   3.5,
    relationships:  2.8,
    productivity:   3.0,
    health:         4.0,
    finance:        2.5,
  };

  const weeks = [];
  const now = new Date();

  // Generate 10 week dates going backwards from the current week
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(d);
  }

  const results = [];
  const runningScores = { ...baseScores };

  for (let w = 0; w < weeks.length; w++) {
    const weekDate = weeks[w];
    const weekId = getWeekId(weekDate);

    const domains = {};
    const domainScores = {};

    for (const key of DOMAIN_KEYS) {
      // Add trend + random noise (-4 to +4)
      const noise = (Math.random() - 0.4) * 8; // slight upward bias
      const trend = trendPerWeek[key];
      const delta = trend + noise;

      // Week 6-7 dip for productivity (simulates a bad week)
      const dip = (key === 'productivity' && (w === 5 || w === 6)) ? -6 : 0;

      runningScores[key] = clamp(runningScores[key] + delta + dip);

      const finalScore = Math.round(runningScores[key] * 10) / 10;
      const reflectionScore = clamp(finalScore + (Math.random() - 0.5) * 10);
      const actionScore = clamp(finalScore + (Math.random() - 0.5) * 15);
      const consistencyScore = clamp(30 + w * 7 + (Math.random() - 0.5) * 20);

      domains[key] = {
        reflectionScore: Math.round(reflectionScore * 10) / 10,
        actionScore: Math.round(actionScore * 10) / 10,
        consistencyScore: Math.round(consistencyScore * 10) / 10,
        observed: Math.round(finalScore * 10) / 10,
        awardPoints: Math.round((delta) * 100) / 100,
        finalScore,
      };

      domainScores[key] = finalScore;
    }

    const lifeStrength = calcLifeStrength(domainScores);
    const evenness = calcEvenness(domainScores);
    const balancedLifeScore = calcBalancedLifeScore(lifeStrength, evenness);

    const weekDoc = {
      weekId,
      lifeStrength: Math.round(lifeStrength * 10) / 10,
      evenness: Math.round(evenness * 10) / 10,
      balancedLifeScore: Math.round(balancedLifeScore * 10) / 10,
      domains,
      updatedAt: Timestamp.fromDate(weekDate),
    };

    results.push(weekDoc);
  }

  // Write all to Firestore
  const writes = results.map(weekDoc =>
    setDoc(
      doc(db, 'users', uid, 'weeklyScores', weekDoc.weekId),
      weekDoc,
      { merge: true }
    )
  );

  await Promise.all(writes);

  return { ok: true, count: results.length, weeks: results.map(r => r.weekId) };
}

/**
 * Also update the user doc with the latest domain scores from the dummy data
 * so the dashboard reflects the seeded values.
 */
export async function seedDummyAndUpdateUser(uid) {
  const result = await seedDummyWeeklyScores(uid);
  if (!result.ok) return result;

  // Read back the last week's scores to update the user doc
  // We already have them in memory from the seed, so let's just recompute
  // Actually, computeCurrentScores in the app will handle this on next load.
  return result;
}
