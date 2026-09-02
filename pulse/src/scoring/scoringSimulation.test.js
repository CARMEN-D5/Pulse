/**
 * scoringSimulation.test.js
 *
 * Simulates the Pulse scoring engine over realistic time periods:
 *   - 14 days  (2 weeks)
 *   - 1 month  (4 weeks)
 *   - 2 months (8 weeks)
 *
 * Each simulation uses a different user profile with realistic weekly
 * activity patterns (reflections, action points, active days) across
 * all 5 life domains. The tests verify that scores evolve correctly
 * and stay within valid bounds over extended periods.
 *
 * User profiles tested:
 *   - Dedicated:       High activity across all domains every week
 *   - Casual:          Moderate, inconsistent activity
 *   - Improving:       Starts weak, gradually increases effort
 *   - Declining:       Starts strong, gradually decreases effort
 *   - Unbalanced:      Strong in 2 domains, neglects the other 3
 *   - Reflection-only: Reflects daily but rarely logs actions (bug fix check)
 *   - Journey:         14-week realistic user story with slump & recovery
 *   - Active→Inactive: 4 weeks of effort, then 4 weeks of no activity
 */

import {
  DOMAINS,
  DOMAIN_KEYS,
  ratingToScore,
  computeDomainBreakdown,
  computeGlobalScores,
  calcLifeStrength,
  calcEvenness,
} from './scoringEngine';

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

/**
 * Run a multi-week simulation across all 5 domains, returning
 * the full score history for analysis and assertions.
 *
 * @param {Object} params.baseline  - Initial 1-5 ratings per domain (onboarding)
 * @param {Array}  params.weeklyData - Array of weekly activity objects, one per week.
 *   Each object has domain keys: { spirituality: { reflections, actionPoints, activeDays }, ... }
 * @returns {Array} History: one entry per week with domainScores, breakdowns, and globals
 */
function simulate({ baseline, weeklyData }) {
  const currentScores = {};
  const lastReflectionScores = {};
  for (const key of DOMAIN_KEYS) {
    currentScores[key] = ratingToScore(baseline[key] ?? 3);
  }

  const history = [];

  for (let w = 0; w < weeklyData.length; w++) {
    const weekActivity = weeklyData[w];
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
// User activity profiles
// ---------------------------------------------------------------------------

/** Dedicated user: reflects daily (4-5), logs actions consistently, active 5-7 days */
function dedicatedWeek() {
  return {
    spirituality:  { reflections: [4, 5, 4, 5, 4, 4, 5], actionPoints: 200, activeDays: 6 },
    relationships: { reflections: [4, 4, 5, 4, 4, 5, 4], actionPoints: 180, activeDays: 5 },
    productivity:  { reflections: [4, 5, 5, 4, 5, 4, 4], actionPoints: 225, activeDays: 6 },
    health:        { reflections: [5, 4, 4, 5, 4, 5, 4], actionPoints: 300, activeDays: 7 },
    finance:       { reflections: [4, 4, 3, 4, 4, 5, 4], actionPoints: 175, activeDays: 5 },
  };
}

/** Casual user: reflects 2-3 times/week (2-4), active 1-3 days. Rotating patterns. */
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

/** Improving user: ramps from low activity (week 1) to dedicated-level (week 8) */
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

/** Declining user: ramps from dedicated-level (week 1) to minimal (week 8) */
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

/** Unbalanced user: strong in health + productivity, neglects other 3 domains */
function unbalancedWeek() {
  return {
    spirituality:  { reflections: [],          actionPoints: 0,   activeDays: 0 },
    relationships: { reflections: [2],         actionPoints: 0,   activeDays: 0 },
    productivity:  { reflections: [5, 5, 4, 5, 5, 4, 5], actionPoints: 250, activeDays: 7 },
    health:        { reflections: [5, 4, 5, 5, 4, 5, 4], actionPoints: 300, activeDays: 7 },
    finance:       { reflections: [3],         actionPoints: 25,  activeDays: 1 },
  };
}

/** Reflection-only: daily reflections in all domains, zero actions. Tests the bug fix. */
function reflectionOnlyWeek() {
  return {
    spirituality:  { reflections: [4, 4, 5, 4, 3, 4, 4], actionPoints: 0, activeDays: 0 },
    relationships: { reflections: [3, 4, 4, 3, 4, 3, 4], actionPoints: 0, activeDays: 0 },
    productivity:  { reflections: [3, 3, 4, 3, 4, 3, 3], actionPoints: 0, activeDays: 0 },
    health:        { reflections: [4, 3, 3, 4, 4, 3, 4], actionPoints: 0, activeDays: 0 },
    finance:       { reflections: [3, 3, 4, 3, 3, 3, 3], actionPoints: 0, activeDays: 0 },
  };
}

// No activity at all for a week
const NO_ACTIVITY = Object.fromEntries(
  DOMAIN_KEYS.map(k => [k, { reflections: [], actionPoints: 0, activeDays: 0 }])
);

// Helper: generate N weeks from a pattern function
function generateWeeks(n, patternFn) {
  return Array.from({ length: n }, (_, i) => patternFn(i + 1));
}

// ---------------------------------------------------------------------------
// Common assertions
// ---------------------------------------------------------------------------

/** Verify all scores in history are within valid [0, 100] bounds */
function assertValidHistory(history) {
  for (const entry of history) {
    for (const key of DOMAIN_KEYS) {
      expect(entry.domainScores[key]).toBeGreaterThanOrEqual(0);
      expect(entry.domainScores[key]).toBeLessThanOrEqual(100);
    }
    expect(entry.lifeStrength).toBeGreaterThanOrEqual(0);
    expect(entry.lifeStrength).toBeLessThanOrEqual(100);
    expect(entry.evenness).toBeGreaterThanOrEqual(0);
    expect(entry.evenness).toBeLessThanOrEqual(100);
    expect(entry.balancedLifeScore).toBeGreaterThanOrEqual(0);
    expect(entry.balancedLifeScore).toBeLessThanOrEqual(100);
    // BLS = 0.5 * LS + 0.5 * E
    expect(entry.balancedLifeScore).toBeCloseTo(
      0.5 * entry.lifeStrength + 0.5 * entry.evenness
    );
  }
}

/** Print a readable score progression table for debugging */
function formatHistory(history, label) {
  const lines = [`\n=== ${label} ===`];
  lines.push('Week | Spirit | Relat  | Produc | Health | Finance | LS     | Even   | BLS');
  lines.push('-'.repeat(85));
  for (const e of history) {
    const d = e.domainScores;
    lines.push(
      `W${String(e.week).padStart(2)} ` +
      `| ${d.spirituality.toFixed(1).padStart(5)} ` +
      `| ${d.relationships.toFixed(1).padStart(5)} ` +
      `| ${d.productivity.toFixed(1).padStart(5)} ` +
      `| ${d.health.toFixed(1).padStart(5)} ` +
      `| ${d.finance.toFixed(1).padStart(6)} ` +
      `| ${e.lifeStrength.toFixed(1).padStart(5)} ` +
      `| ${e.evenness.toFixed(1).padStart(5)} ` +
      `| ${e.balancedLifeScore.toFixed(1).padStart(5)}`
    );
  }
  return lines.join('\n');
}

// =========================================================================
// 14-DAY (2-WEEK) SIMULATIONS
// =========================================================================
describe('14-day simulation (2 weeks)', () => {
  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };

  describe('Dedicated user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(2, () => dedicatedWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    test('all domain scores increase from baseline (60) over 2 weeks', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[1].domainScores[key]).toBeGreaterThan(60);
      }
    });

    test('week 2 scores are higher than or equal to week 1', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[1].domainScores[key]).toBeGreaterThanOrEqual(history[0].domainScores[key]);
      }
    });

    test('BLS increases over the 2 weeks', () => {
      const startBLS = computeGlobalScores(
        Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]))
      ).balancedLifeScore;
      expect(history[1].balancedLifeScore).toBeGreaterThan(startBLS);
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Dedicated User — 14 days'));
    });
  });

  describe('Casual user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(2, (w) => casualWeek(w)),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    test('scores stay close to baseline (within ±5 of 60)', () => {
      for (const key of DOMAIN_KEYS) {
        expect(Math.abs(history[1].domainScores[key] - 60)).toBeLessThan(5);
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Casual User — 14 days'));
    });
  });

  describe('Reflection-only user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(2, () => reflectionOnlyWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Critical bug fix check: reflection-only must NOT change scores
    test('all domain scores remain exactly at baseline (60) for both weeks', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[0].domainScores[key]).toBe(60);
        expect(history[1].domainScores[key]).toBe(60);
      }
    });

    test('BLS stays at 80 (LS=60, E=100)', () => {
      expect(history[1].balancedLifeScore).toBe(80);
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Reflection-only User — 14 days'));
    });
  });
});

// =========================================================================
// 1-MONTH (4-WEEK) SIMULATIONS
// =========================================================================
describe('1-month simulation (4 weeks)', () => {
  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };

  describe('Dedicated user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(4, () => dedicatedWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    test('all domain scores increase over 4 weeks', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[3].domainScores[key]).toBeGreaterThan(60);
      }
    });

    test('monotonically increasing across weeks', () => {
      for (let w = 1; w < 4; w++) {
        for (const key of DOMAIN_KEYS) {
          expect(history[w].domainScores[key]).toBeGreaterThanOrEqual(history[w - 1].domainScores[key]);
        }
      }
    });

    test('BLS increases each week', () => {
      for (let w = 1; w < 4; w++) {
        expect(history[w].balancedLifeScore).toBeGreaterThanOrEqual(history[w - 1].balancedLifeScore);
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Dedicated User — 1 month'));
    });
  });

  describe('Improving user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(4, (w) => improvingWeek(w)),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Improving user starts very weak (t=0 → 10% capacity), so early
    // weeks have negative awards. But the weekly award improves each week
    // as activity ramps up — the rate of change is the signal.
    test('award points improve each week (activity is ramping up)', () => {
      for (const key of DOMAIN_KEYS) {
        const awards = history.map(h => h.breakdowns[key].awardPoints);
        for (let w = 1; w < awards.length; w++) {
          expect(awards[w]).toBeGreaterThanOrEqual(awards[w - 1]);
        }
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Improving User — 1 month'));
    });
  });

  describe('Declining user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(4, (w) => decliningWeek(w)),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Declining user starts near-dedicated (t=0 → 100% capacity), so
    // early weeks have strong positive awards. But the weekly award
    // decreases each week as activity fades — the trend is the signal.
    test('award points decrease each week (activity is fading)', () => {
      for (const key of DOMAIN_KEYS) {
        const awards = history.map(h => h.breakdowns[key].awardPoints);
        for (let w = 1; w < awards.length; w++) {
          expect(awards[w]).toBeLessThanOrEqual(awards[w - 1]);
        }
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Declining User — 1 month'));
    });
  });

  describe('Unbalanced user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(4, () => unbalancedWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Health & productivity should go up, neglected domains stay flat or frozen
    test('health and productivity scores increase', () => {
      expect(history[3].domainScores.health).toBeGreaterThan(60);
      expect(history[3].domainScores.productivity).toBeGreaterThan(60);
    });

    test('neglected domain (spirituality) stays at or below baseline', () => {
      expect(history[3].domainScores.spirituality).toBeLessThanOrEqual(60);
    });

    // Imbalance between strong and weak domains → evenness penalty
    test('evenness drops due to domain imbalance', () => {
      expect(history[3].evenness).toBeLessThan(100);
    });

    // BLS is penalised vs what a balanced user would achieve
    test('BLS is lower than a balanced user with the same LS would have', () => {
      const theoreticalBLS = 0.5 * history[3].lifeStrength + 0.5 * 100;
      expect(history[3].balancedLifeScore).toBeLessThan(theoreticalBLS);
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Unbalanced User — 1 month'));
    });
  });
});

// =========================================================================
// 2-MONTH (8-WEEK) SIMULATIONS
// =========================================================================
describe('2-month simulation (8 weeks)', () => {
  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };

  describe('Dedicated user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, () => dedicatedWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Award ≈ +1.2/week for finance (lowest), +1.6 for health (highest).
    // After 8 weeks: finance ≈ 69.7, health ≈ 72.8. Threshold is 69.
    test('all domain scores are well above baseline by week 8', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[7].domainScores[key]).toBeGreaterThan(69);
      }
    });

    test('total score gain exceeds 9 points per domain', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[7].domainScores[key] - 60).toBeGreaterThan(9);
      }
    });

    test('BLS steadily increases', () => {
      for (let w = 1; w < 8; w++) {
        expect(history[w].balancedLifeScore).toBeGreaterThanOrEqual(history[w - 1].balancedLifeScore);
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Dedicated User — 2 months'));
    });
  });

  describe('Improving user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, (w) => improvingWeek(w)),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    test('final scores exceed baseline (60)', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[7].domainScores[key]).toBeGreaterThan(60);
      }
    });

    // Last few weeks should show consistent improvement as activity is now high
    test('later weeks (5-8) show consistent improvement', () => {
      for (let w = 5; w < 8; w++) {
        for (const key of DOMAIN_KEYS) {
          expect(history[w].domainScores[key]).toBeGreaterThanOrEqual(history[w - 1].domainScores[key]);
        }
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Improving User — 2 months'));
    });
  });

  describe('Declining user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, (w) => decliningWeek(w)),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Declining user starts strong (week 1 is near-dedicated), so scores
    // rise before falling. By week 8, scores are still near baseline but
    // trending down — the later weeks have lower scores than the peak.
    test('final scores are lower than peak scores', () => {
      const peakWeek = 1; // week 2 (index 1) is typically the peak
      for (const key of DOMAIN_KEYS) {
        expect(history[7].domainScores[key]).toBeLessThan(history[peakWeek].domainScores[key]);
      }
    });

    test('last 4 weeks show declining trend', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[7].domainScores[key]).toBeLessThan(history[3].domainScores[key]);
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Declining User — 2 months'));
    });
  });

  describe('Unbalanced user', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, () => unbalancedWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    test('strong domains (health, productivity) are above 70', () => {
      expect(history[7].domainScores.health).toBeGreaterThan(70);
      expect(history[7].domainScores.productivity).toBeGreaterThan(70);
    });

    test('neglected domain (spirituality) stays at or below 60', () => {
      expect(history[7].domainScores.spirituality).toBeLessThanOrEqual(60);
    });

    test('evenness penalty is significant after 8 weeks', () => {
      expect(history[7].evenness).toBeLessThan(90);
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Unbalanced User — 2 months'));
    });
  });

  describe('Reflection-only user (8 weeks)', () => {
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, () => reflectionOnlyWeek()),
    });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Bug fix verification: 8 consecutive weeks of only reflections must never change scores
    test('all domain scores remain exactly at 60 for all 8 weeks', () => {
      for (let w = 0; w < 8; w++) {
        for (const key of DOMAIN_KEYS) {
          expect(history[w].domainScores[key]).toBe(60);
        }
      }
    });

    test('BLS stays constant at 80 for all 8 weeks', () => {
      for (let w = 0; w < 8; w++) {
        expect(history[w].balancedLifeScore).toBe(80);
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Reflection-only User — 2 months'));
    });
  });

  describe('Active then inactive (4+4 weeks)', () => {
    const weeklyData = [
      ...generateWeeks(4, () => dedicatedWeek()),
      ...generateWeeks(4, () => NO_ACTIVITY),
    ];
    const history = simulate({ baseline, weeklyData });

    test('all scores stay within valid bounds', () => assertValidHistory(history));

    // Scores should climb during the active phase
    test('scores increase during active phase (weeks 1-4)', () => {
      for (const key of DOMAIN_KEYS) {
        expect(history[3].domainScores[key]).toBeGreaterThan(60);
      }
    });

    // Scores must freeze perfectly during the inactive phase
    test('scores freeze during inactive phase (weeks 5-8 = history[4-7])', () => {
      for (let w = 4; w < 8; w++) {
        for (const key of DOMAIN_KEYS) {
          expect(history[w].domainScores[key]).toBe(history[3].domainScores[key]);
        }
      }
    });

    test('print progression', () => {
      console.log(formatHistory(history, 'Active→Inactive User — 2 months'));
    });
  });
});

// =========================================================================
// 14-WEEK REALISTIC USER JOURNEY
// Weeks 1-3: Getting started. Weeks 4-6: Building habits.
// Weeks 7-8: Slump. Weeks 9-10: Recovery. Weeks 11-14: Sustained excellence.
// =========================================================================
describe('14-week user journey', () => {
  const JOURNEY_WEEKS = [
    // Week 1: First week, light activity
    {
      spirituality:  { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      relationships: { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2],       actionPoints: 50,  activeDays: 2 },
      health:        { reflections: [3],       actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [2],       actionPoints: 25,  activeDays: 1 },
    },
    // Week 2: Slightly more engaged
    {
      spirituality:  { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3, 4],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [3, 3],    actionPoints: 75,  activeDays: 3 },
      health:        { reflections: [3, 4],    actionPoints: 150, activeDays: 4 },
      finance:       { reflections: [3],       actionPoints: 50,  activeDays: 2 },
    },
    // Week 3: Building momentum
    {
      spirituality:  { reflections: [4, 3, 4], actionPoints: 100, activeDays: 4 },
      relationships: { reflections: [3, 4],    actionPoints: 100, activeDays: 3 },
      productivity:  { reflections: [3, 3, 4], actionPoints: 100, activeDays: 4 },
      health:        { reflections: [4, 4],    actionPoints: 150, activeDays: 4 },
      finance:       { reflections: [3, 3],    actionPoints: 75,  activeDays: 3 },
    },
    // Week 4: Good habits forming
    {
      spirituality:  { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4],    actionPoints: 100, activeDays: 4 },
      productivity:  { reflections: [4, 3, 4], actionPoints: 150, activeDays: 5 },
      health:        { reflections: [4, 4, 4], actionPoints: 200, activeDays: 5 },
      finance:       { reflections: [3, 4],    actionPoints: 100, activeDays: 3 },
    },
    // Week 5: Strong week
    {
      spirituality:  { reflections: [4, 4, 5], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 4, 4], actionPoints: 200, activeDays: 6 },
      health:        { reflections: [4, 5, 4], actionPoints: 250, activeDays: 6 },
      finance:       { reflections: [4, 4],    actionPoints: 150, activeDays: 4 },
    },
    // Week 6: Peak engagement
    {
      spirituality:  { reflections: [5, 4, 5], actionPoints: 200, activeDays: 6 },
      relationships: { reflections: [4, 5, 4], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 5, 4], actionPoints: 200, activeDays: 6 },
      health:        { reflections: [5, 5, 4], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
    },
    // Week 7: Slump begins
    {
      spirituality:  { reflections: [4, 3],    actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3, 3],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2],       actionPoints: 25,  activeDays: 1 },
      health:        { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [],        actionPoints: 0,   activeDays: 0 },
    },
    // Week 8: Continued slump
    {
      spirituality:  { reflections: [3],       actionPoints: 50,  activeDays: 2 },
      relationships: { reflections: [2, 3],    actionPoints: 50,  activeDays: 2 },
      productivity:  { reflections: [2, 2],    actionPoints: 50,  activeDays: 2 },
      health:        { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      finance:       { reflections: [2],       actionPoints: 25,  activeDays: 1 },
    },
    // Week 9: Recovery starts
    {
      spirituality:  { reflections: [3, 4],    actionPoints: 100, activeDays: 3 },
      relationships: { reflections: [3, 3, 4], actionPoints: 100, activeDays: 4 },
      productivity:  { reflections: [3, 3],    actionPoints: 100, activeDays: 3 },
      health:        { reflections: [4, 4],    actionPoints: 200, activeDays: 5 },
      finance:       { reflections: [3, 3],    actionPoints: 75,  activeDays: 3 },
    },
    // Week 10: Recovery continues
    {
      spirituality:  { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4],    actionPoints: 100, activeDays: 4 },
      productivity:  { reflections: [3, 4, 4], actionPoints: 150, activeDays: 5 },
      health:        { reflections: [4, 4, 5], actionPoints: 250, activeDays: 6 },
      finance:       { reflections: [3, 4],    actionPoints: 100, activeDays: 4 },
    },
    // Week 11: Back to strong
    {
      spirituality:  { reflections: [4, 5, 4], actionPoints: 200, activeDays: 6 },
      relationships: { reflections: [4, 4, 5], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 4, 5], actionPoints: 200, activeDays: 6 },
      health:        { reflections: [5, 5, 4], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [4, 4, 4], actionPoints: 150, activeDays: 5 },
    },
    // Week 12: Consistently strong
    {
      spirituality:  { reflections: [5, 4, 5], actionPoints: 200, activeDays: 6 },
      relationships: { reflections: [5, 4, 4], actionPoints: 200, activeDays: 6 },
      productivity:  { reflections: [4, 5, 5], actionPoints: 250, activeDays: 7 },
      health:        { reflections: [5, 5, 5], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [4, 5, 4], actionPoints: 200, activeDays: 6 },
    },
    // Week 13: Near-perfect
    {
      spirituality:  { reflections: [5, 5, 5], actionPoints: 200, activeDays: 7 },
      relationships: { reflections: [5, 5, 4], actionPoints: 200, activeDays: 6 },
      productivity:  { reflections: [5, 5, 5], actionPoints: 250, activeDays: 7 },
      health:        { reflections: [5, 5, 5], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [5, 4, 5], actionPoints: 200, activeDays: 7 },
    },
    // Week 14: Sustained excellence
    {
      spirituality:  { reflections: [5, 5, 4, 5], actionPoints: 200, activeDays: 7 },
      relationships: { reflections: [5, 5, 5],    actionPoints: 200, activeDays: 7 },
      productivity:  { reflections: [5, 4, 5, 5], actionPoints: 250, activeDays: 7 },
      health:        { reflections: [5, 5, 5, 5], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [5, 5, 5],    actionPoints: 200, activeDays: 7 },
    },
  ];

  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };
  const history = simulate({ baseline, weeklyData: JOURNEY_WEEKS });

  test('produces exactly 14 weekly results', () => {
    expect(history).toHaveLength(14);
  });

  test('all scores stay within valid bounds', () => assertValidHistory(history));

  // Scores change by at most ±2 per week (award point range)
  test('max weekly change per domain is ≤ 2', () => {
    for (let w = 1; w < history.length; w++) {
      for (const key of DOMAIN_KEYS) {
        const delta = Math.abs(history[w].domainScores[key] - history[w - 1].domainScores[key]);
        expect(delta).toBeLessThanOrEqual(2.01);
      }
    }
  });

  // Growth phase (weeks 1-6)
  test('all scores rise during growth phase (week 1 → week 6)', () => {
    for (const key of DOMAIN_KEYS) {
      expect(history[5].domainScores[key]).toBeGreaterThan(history[0].domainScores[key]);
    }
  });

  test('BLS increases from week 1 to week 6', () => {
    expect(history[5].balancedLifeScore).toBeGreaterThan(history[0].balancedLifeScore);
  });

  // Slump phase (weeks 7-8)
  test('productivity drops during slump', () => {
    expect(history[7].domainScores.productivity).toBeLessThan(history[5].domainScores.productivity);
  });

  test('finance freezes when no activity (week 7)', () => {
    expect(history[6].domainScores.finance).toBe(history[5].domainScores.finance);
  });

  test('BLS decreases during slump', () => {
    expect(history[7].balancedLifeScore).toBeLessThan(history[5].balancedLifeScore);
  });

  // Recovery (weeks 9-10)
  test('productivity recovers from slump (week 8 → week 10)', () => {
    expect(history[9].domainScores.productivity).toBeGreaterThan(history[7].domainScores.productivity);
  });

  test('finance recovers from slump', () => {
    expect(history[9].domainScores.finance).toBeGreaterThan(history[7].domainScores.finance);
  });

  // Excellence phase (weeks 11-14)
  test('all week 14 scores exceed both week 1 and post-slump values', () => {
    for (const key of DOMAIN_KEYS) {
      expect(history[13].domainScores[key]).toBeGreaterThan(history[0].domainScores[key]);
      expect(history[13].domainScores[key]).toBeGreaterThan(history[7].domainScores[key]);
    }
  });

  test('week 14 BLS is the highest of the entire 14 weeks', () => {
    const maxBLS = Math.max(...history.map(w => w.balancedLifeScore));
    expect(history[13].balancedLifeScore).toBeCloseTo(maxBLS);
  });

  test('LS exceeds 65 by week 14', () => {
    expect(history[13].lifeStrength).toBeGreaterThan(65);
  });

  test('evenness exceeds 80 by week 14 (balanced recovery)', () => {
    expect(history[13].evenness).toBeGreaterThan(80);
  });

  // Award point mechanics
  test('peak week (week 6) has positive awards for all domains', () => {
    for (const key of DOMAIN_KEYS) {
      expect(history[5].breakdowns[key].awardPoints).toBeGreaterThan(0);
    }
  });

  test('no-activity domain gets 0 award (finance week 7)', () => {
    expect(history[6].breakdowns.finance.awardPoints).toBe(0);
  });

  test('all award points are in [-2, +2] range across all weeks', () => {
    for (const entry of history) {
      for (const key of DOMAIN_KEYS) {
        expect(entry.breakdowns[key].awardPoints).toBeGreaterThanOrEqual(-2);
        expect(entry.breakdowns[key].awardPoints).toBeLessThanOrEqual(2);
      }
    }
  });

  test('print full 14-week journey', () => {
    console.log(formatHistory(history, '14-Week User Journey'));
  });
});

// =========================================================================
// Cross-profile comparison at 8 weeks
// =========================================================================
describe('Cross-profile comparison at 8 weeks', () => {
  const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };

  const dedicated = simulate({ baseline, weeklyData: generateWeeks(8, () => dedicatedWeek()) });
  const casual    = simulate({ baseline, weeklyData: generateWeeks(8, (w) => casualWeek(w)) });
  const improving = simulate({ baseline, weeklyData: generateWeeks(8, (w) => improvingWeek(w)) });
  const declining = simulate({ baseline, weeklyData: generateWeeks(8, (w) => decliningWeek(w)) });
  const unbal     = simulate({ baseline, weeklyData: generateWeeks(8, () => unbalancedWeek()) });
  const reflOnly  = simulate({ baseline, weeklyData: generateWeeks(8, () => reflectionOnlyWeek()) });

  test('dedicated user has highest BLS', () => {
    const dedBLS = dedicated[7].balancedLifeScore;
    expect(dedBLS).toBeGreaterThan(casual[7].balancedLifeScore);
    expect(dedBLS).toBeGreaterThan(improving[7].balancedLifeScore);
    expect(dedBLS).toBeGreaterThan(declining[7].balancedLifeScore);
    expect(dedBLS).toBeGreaterThan(unbal[7].balancedLifeScore);
  });

  // Declining user starts strong then fades. Their final BLS is lower
  // than dedicated and improving, but may still be above casual/reflection-only
  // because early weeks built up score that hasn't fully eroded.
  test('declining user ends with lower BLS than improving user', () => {
    expect(declining[7].balancedLifeScore).toBeLessThan(improving[7].balancedLifeScore);
  });

  test('reflection-only user stays exactly at baseline BLS (80)', () => {
    expect(reflOnly[7].balancedLifeScore).toBe(80);
  });

  test('unbalanced user has lower BLS than dedicated despite some high domains', () => {
    expect(unbal[7].balancedLifeScore).toBeLessThan(dedicated[7].balancedLifeScore);
  });

  test('improving user ends higher than casual user', () => {
    expect(improving[7].balancedLifeScore).toBeGreaterThan(casual[7].balancedLifeScore);
  });

  test('print comparison table', () => {
    const profiles = [
      { name: 'Dedicated',       data: dedicated[7] },
      { name: 'Improving',       data: improving[7] },
      { name: 'Casual',          data: casual[7] },
      { name: 'Reflection-only', data: reflOnly[7] },
      { name: 'Unbalanced',      data: unbal[7] },
      { name: 'Declining',       data: declining[7] },
    ];
    console.log('\n=== Cross-profile comparison at Week 8 ===');
    console.log('Profile          | LS     | Even   | BLS');
    console.log('-'.repeat(50));
    for (const p of profiles) {
      console.log(
        `${p.name.padEnd(17)}` +
        `| ${p.data.lifeStrength.toFixed(1).padStart(5)} ` +
        `| ${p.data.evenness.toFixed(1).padStart(5)} ` +
        `| ${p.data.balancedLifeScore.toFixed(1).padStart(5)}`
      );
    }
  });
});

// =========================================================================
// Different starting baselines
// =========================================================================
describe('Different baseline scenarios', () => {
  test('user starting at all 1s (score=20) can climb with sustained effort (8 weeks)', () => {
    const lowBaseline = { spirituality: 1, relationships: 1, productivity: 1, health: 1, finance: 1 };
    const history = simulate({
      baseline: lowBaseline,
      weeklyData: generateWeeks(8, () => dedicatedWeek()),
    });
    assertValidHistory(history);
    // Starting at 20, finance gains ≈ 1.2/week → 20 + 9.7 ≈ 29.7
    // Health gains ≈ 1.6/week → 20 + 12.8 ≈ 32.8
    for (const key of DOMAIN_KEYS) {
      expect(history[7].domainScores[key]).toBeGreaterThan(29);
    }
  });

  test('user starting at all 5s (score=100) with poor effort drops (8 weeks)', () => {
    const highBaseline = { spirituality: 5, relationships: 5, productivity: 5, health: 5, finance: 5 };
    const history = simulate({
      baseline: highBaseline,
      weeklyData: generateWeeks(8, (w) => decliningWeek(w)),
    });
    assertValidHistory(history);
    for (const key of DOMAIN_KEYS) {
      expect(history[7].domainScores[key]).toBeLessThan(100);
    }
  });

  test('uneven baseline converges with balanced effort (8 weeks)', () => {
    // Health=5(100), Finance=1(20), others=3(60)
    const unevenBaseline = { spirituality: 3, relationships: 3, productivity: 3, health: 5, finance: 1 };
    const history = simulate({
      baseline: unevenBaseline,
      weeklyData: generateWeeks(8, () => dedicatedWeek()),
    });
    assertValidHistory(history);
    // Finance should rise, evenness should improve
    expect(history[7].domainScores.finance).toBeGreaterThan(20);
    expect(history[7].evenness).toBeGreaterThan(
      computeGlobalScores({
        spirituality: 60, relationships: 60, productivity: 60, health: 100, finance: 20,
      }).evenness
    );
  });

  test('completely inactive user retains baseline for 8 weeks', () => {
    const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };
    const history = simulate({
      baseline,
      weeklyData: generateWeeks(8, () => NO_ACTIVITY),
    });
    for (let w = 0; w < 8; w++) {
      for (const key of DOMAIN_KEYS) {
        expect(history[w].domainScores[key]).toBe(60);
      }
    }
  });
});
