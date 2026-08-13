// ---------------------------------------------------------------------------
// 14-Week Scoring Simulation Tests
//
// Simulates a realistic user journey through 14 weeks of activity,
// running the full VELORA scoring pipeline each week:
//   computeDomainBreakdown → computeGlobalScores
//
// The previousScore from each week feeds into the next, exactly as the
// live app does via Firestore snapshots.
// ---------------------------------------------------------------------------

import {
  computeDomainBreakdown,
  computeGlobalScores,
  calcLifeStrength,
  calcEvenness,
  calcBalancedLifeScore,
  DOMAINS,
  DOMAIN_KEYS,
  ratingToScore,
} from './scoringEngine';

// ---------------------------------------------------------------------------
// Helper: run one week for every domain and return updated scores + globals
// ---------------------------------------------------------------------------
function simulateWeek(prevScores, weekActivity) {
  const domainScores = {};
  const breakdowns = {};

  for (const key of DOMAIN_KEYS) {
    const act = weekActivity[key] || { reflections: [], actionPoints: 0, activeDays: 0 };
    const breakdown = computeDomainBreakdown({
      previousScore: prevScores[key],
      reflections: act.reflections,
      actionPoints: act.actionPoints,
      activeDays: act.activeDays,
      weeklyTarget: DOMAINS[key].weeklyTarget,
    });
    domainScores[key] = breakdown.finalScore;
    breakdowns[key] = breakdown;
  }

  const global = computeGlobalScores(domainScores);
  return { domainScores, breakdowns, ...global };
}

// ---------------------------------------------------------------------------
// 14-week activity schedule
//
// Weeks 1-3:   User is getting started, moderate activity
// Weeks 4-6:   Building habits, good engagement
// Weeks 7-8:   Slump — productivity and finance drop off
// Weeks 9-10:  Recovery, getting back on track
// Weeks 11-14: Strong consistent engagement across all domains
// ---------------------------------------------------------------------------
const WEEKLY_ACTIVITY = [
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
  // Week 7: Slump begins — productivity & finance drop
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
  // Week 9: Starting recovery
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

// Onboarding baseline: user rates themselves 3/5 across all domains → 60/100
const BASELINE = Object.fromEntries(DOMAIN_KEYS.map(k => [k, ratingToScore(3)]));

// Run the full 14-week simulation once and reuse across tests
function runSimulation() {
  const history = []; // { week, domainScores, breakdowns, lifeStrength, evenness, balancedLifeScore }
  let prevScores = { ...BASELINE };

  for (let w = 0; w < WEEKLY_ACTIVITY.length; w++) {
    const result = simulateWeek(prevScores, WEEKLY_ACTIVITY[w]);
    history.push({ week: w + 1, ...result });
    prevScores = { ...result.domainScores };
  }

  return history;
}

const SIM = runSimulation();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('14-week simulation — score bounds', () => {
  test('all domain scores remain within 0-100 every week', () => {
    for (const week of SIM) {
      for (const key of DOMAIN_KEYS) {
        expect(week.domainScores[key]).toBeGreaterThanOrEqual(0);
        expect(week.domainScores[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  test('lifeStrength remains within 0-100 every week', () => {
    for (const week of SIM) {
      expect(week.lifeStrength).toBeGreaterThanOrEqual(0);
      expect(week.lifeStrength).toBeLessThanOrEqual(100);
    }
  });

  test('evenness remains within 0-100 every week', () => {
    for (const week of SIM) {
      expect(week.evenness).toBeGreaterThanOrEqual(0);
      expect(week.evenness).toBeLessThanOrEqual(100);
    }
  });

  test('balancedLifeScore remains within 0-100 every week', () => {
    for (const week of SIM) {
      expect(week.balancedLifeScore).toBeGreaterThanOrEqual(0);
      expect(week.balancedLifeScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('14-week simulation — upward trend (weeks 1-6)', () => {
  test('health score increases over the first 6 weeks of good activity', () => {
    expect(SIM[5].domainScores.health).toBeGreaterThan(SIM[0].domainScores.health);
  });

  test('productivity score increases over weeks 1-6', () => {
    expect(SIM[5].domainScores.productivity).toBeGreaterThan(SIM[0].domainScores.productivity);
  });

  test('spirituality score increases over weeks 1-6', () => {
    expect(SIM[5].domainScores.spirituality).toBeGreaterThan(SIM[0].domainScores.spirituality);
  });

  test('balancedLifeScore at week 6 is higher than week 1', () => {
    expect(SIM[5].balancedLifeScore).toBeGreaterThan(SIM[0].balancedLifeScore);
  });

  test('lifeStrength trends upward from week 1 to week 6', () => {
    expect(SIM[5].lifeStrength).toBeGreaterThan(SIM[0].lifeStrength);
  });
});

describe('14-week simulation — slump (weeks 7-8)', () => {
  test('productivity drops during slump weeks', () => {
    // Week 7-8 have very low productivity activity
    expect(SIM[7].domainScores.productivity).toBeLessThan(SIM[5].domainScores.productivity);
  });

  test('finance stalls when no activity is logged (week 7)', () => {
    // Week 7: finance has 0 actionPoints, 0 activeDays → no activity → score unchanged
    expect(SIM[6].domainScores.finance).toBe(SIM[5].domainScores.finance);
  });

  test('health is more resilient during slump (still some activity)', () => {
    // Health still had moderate activity during weeks 7-8
    const healthDrop = SIM[5].domainScores.health - SIM[7].domainScores.health;
    const prodDrop = SIM[5].domainScores.productivity - SIM[7].domainScores.productivity;
    expect(healthDrop).toBeLessThan(prodDrop);
  });

  test('balancedLifeScore decreases during slump', () => {
    expect(SIM[7].balancedLifeScore).toBeLessThan(SIM[5].balancedLifeScore);
  });
});

describe('14-week simulation — recovery (weeks 9-10)', () => {
  test('productivity recovers from week 8 to week 10', () => {
    expect(SIM[9].domainScores.productivity).toBeGreaterThan(SIM[7].domainScores.productivity);
  });

  test('finance recovers from week 8 to week 10', () => {
    expect(SIM[9].domainScores.finance).toBeGreaterThan(SIM[7].domainScores.finance);
  });

  test('balancedLifeScore recovers by week 12', () => {
    // Award points are small (±2), so full recovery takes several strong weeks
    expect(SIM[11].balancedLifeScore).toBeGreaterThan(SIM[7].balancedLifeScore);
  });
});

describe('14-week simulation — sustained excellence (weeks 11-14)', () => {
  test('all domain scores at week 14 exceed their week 1 values', () => {
    for (const key of DOMAIN_KEYS) {
      expect(SIM[13].domainScores[key]).toBeGreaterThan(SIM[0].domainScores[key]);
    }
  });

  test('all domain scores at week 14 exceed their post-slump values', () => {
    for (const key of DOMAIN_KEYS) {
      expect(SIM[13].domainScores[key]).toBeGreaterThan(SIM[7].domainScores[key]);
    }
  });

  test('balancedLifeScore at week 14 is the highest of the entire run', () => {
    const maxBLS = Math.max(...SIM.map(w => w.balancedLifeScore));
    expect(SIM[13].balancedLifeScore).toBeCloseTo(maxBLS);
  });

  test('lifeStrength at week 14 exceeds 65', () => {
    expect(SIM[13].lifeStrength).toBeGreaterThan(65);
  });

  test('evenness at week 14 exceeds 80 (domains are balanced)', () => {
    expect(SIM[13].evenness).toBeGreaterThan(80);
  });
});

describe('14-week simulation — award point mechanics', () => {
  test('perfect week (week 6) produces positive award points for all domains', () => {
    for (const key of DOMAIN_KEYS) {
      expect(SIM[5].breakdowns[key].awardPoints).toBeGreaterThan(0);
    }
  });

  test('poor week (week 8) produces negative or near-zero awards for weak domains', () => {
    // Productivity had low activity in week 8
    expect(SIM[7].breakdowns.productivity.awardPoints).toBeLessThan(
      SIM[5].breakdowns.productivity.awardPoints
    );
  });

  test('no-activity domain (finance week 7) gets 0 award points', () => {
    expect(SIM[6].breakdowns.finance.awardPoints).toBe(0);
  });

  test('award points are always in the range [-2, +2]', () => {
    for (const week of SIM) {
      for (const key of DOMAIN_KEYS) {
        expect(week.breakdowns[key].awardPoints).toBeGreaterThanOrEqual(-2);
        expect(week.breakdowns[key].awardPoints).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('14-week simulation — R/A/C breakdown validation', () => {
  test('reflectionScore is based on average of ratings × 20', () => {
    // Week 4 spirituality: reflections [4,4,4] → avg 4 → R = 80
    expect(SIM[3].breakdowns.spirituality.reflectionScore).toBeCloseTo(80);
  });

  test('actionScore is capped at 100 even when exceeding target', () => {
    // Week 6 health: actionPoints=300, weeklyTarget=300 → A = 100
    expect(SIM[5].breakdowns.health.actionScore).toBe(100);
  });

  test('consistencyScore scales linearly with active days', () => {
    // Week 6 health: 7 active days → C = 100
    expect(SIM[5].breakdowns.health.consistencyScore).toBe(100);
    // Week 1 finance: 1 active day → C ≈ 14.29
    expect(SIM[0].breakdowns.finance.consistencyScore).toBeCloseTo(14.29);
  });

  test('observed = 0.3R + 0.4A + 0.3C', () => {
    const b = SIM[3].breakdowns.spirituality;
    const expected = 0.3 * b.reflectionScore + 0.4 * b.actionScore + 0.3 * b.consistencyScore;
    expect(b.observed).toBeCloseTo(expected);
  });
});

describe('14-week simulation — evenness behaviour', () => {
  test('evenness is higher when all domains are close in score', () => {
    // Compare early weeks (domains start equal) vs slump weeks (diverge)
    expect(SIM[0].evenness).toBeGreaterThan(SIM[7].evenness);
  });

  test('evenness stays high during sustained balanced effort (weeks 11-14)', () => {
    // With ±2 max delta, domains that diverged during slump converge slowly;
    // evenness at week 14 should still be well above 80
    expect(SIM[13].evenness).toBeGreaterThan(80);
  });
});

describe('14-week simulation — global score consistency', () => {
  test('balancedLifeScore = 0.5 × lifeStrength + 0.5 × evenness every week', () => {
    for (const week of SIM) {
      const expected = 0.5 * week.lifeStrength + 0.5 * week.evenness;
      expect(week.balancedLifeScore).toBeCloseTo(expected);
    }
  });

  test('lifeStrength = average of all 5 domain scores every week', () => {
    for (const week of SIM) {
      const avg = DOMAIN_KEYS.reduce((s, k) => s + week.domainScores[k], 0) / 5;
      expect(week.lifeStrength).toBeCloseTo(avg);
    }
  });
});

describe('14-week simulation — score stability', () => {
  test('scores change gradually (max delta per week ≤ 2 per domain)', () => {
    for (let w = 1; w < SIM.length; w++) {
      for (const key of DOMAIN_KEYS) {
        const delta = Math.abs(SIM[w].domainScores[key] - SIM[w - 1].domainScores[key]);
        expect(delta).toBeLessThanOrEqual(2.01); // award points max ±2
      }
    }
  });

  test('14 weeks of data produces exactly 14 results', () => {
    expect(SIM).toHaveLength(14);
  });
});

describe('14-week simulation — different baseline scenario', () => {
  test('user starting with uneven baseline sees all domains rise with balanced effort', () => {
    // Uneven start: health=80, finance=20, others=60
    const unevenBaseline = {
      spirituality: 60, relationships: 60, productivity: 60, health: 80, finance: 20,
    };

    // 14 weeks of uniform good activity
    const uniformActivity = {
      spirituality:  { reflections: [4, 4], actionPoints: 150, activeDays: 5 },
      relationships: { reflections: [4, 4], actionPoints: 150, activeDays: 5 },
      productivity:  { reflections: [4, 4], actionPoints: 200, activeDays: 5 },
      health:        { reflections: [4, 4], actionPoints: 250, activeDays: 5 },
      finance:       { reflections: [4, 4], actionPoints: 150, activeDays: 5 },
    };

    let scores = { ...unevenBaseline };

    for (let w = 0; w < 14; w++) {
      const result = simulateWeek(scores, uniformActivity);
      scores = { ...result.domainScores };
    }

    // With consistent positive activity, all domains should increase —
    // including the lowest one (finance started at 20)
    expect(scores.finance).toBeGreaterThan(20);
    expect(scores.spirituality).toBeGreaterThan(60);
    expect(scores.health).toBeGreaterThan(80);

    // LifeStrength should be well above the initial average of (60+60+60+80+20)/5 = 56
    const endLS = calcLifeStrength(scores);
    expect(endLS).toBeGreaterThan(56);
  });

  test('user starting at very low scores can climb with sustained effort', () => {
    const lowBaseline = Object.fromEntries(DOMAIN_KEYS.map(k => [k, ratingToScore(1)])); // all 20

    const strongActivity = {
      spirituality:  { reflections: [5, 5, 5], actionPoints: 200, activeDays: 7 },
      relationships: { reflections: [5, 5, 5], actionPoints: 200, activeDays: 7 },
      productivity:  { reflections: [5, 5, 5], actionPoints: 250, activeDays: 7 },
      health:        { reflections: [5, 5, 5], actionPoints: 300, activeDays: 7 },
      finance:       { reflections: [5, 5, 5], actionPoints: 200, activeDays: 7 },
    };

    let scores = { ...lowBaseline };
    for (let w = 0; w < 14; w++) {
      const result = simulateWeek(scores, strongActivity);
      scores = { ...result.domainScores };
    }

    // After 14 perfect weeks starting from 20, all domains should be well above 40
    for (const key of DOMAIN_KEYS) {
      expect(scores[key]).toBeGreaterThan(40);
    }
  });

  test('completely inactive user retains baseline scores', () => {
    const baseline = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]));
    const noActivity = {
      spirituality:  { reflections: [], actionPoints: 0, activeDays: 0 },
      relationships: { reflections: [], actionPoints: 0, activeDays: 0 },
      productivity:  { reflections: [], actionPoints: 0, activeDays: 0 },
      health:        { reflections: [], actionPoints: 0, activeDays: 0 },
      finance:       { reflections: [], actionPoints: 0, activeDays: 0 },
    };

    let scores = { ...baseline };
    for (let w = 0; w < 14; w++) {
      const result = simulateWeek(scores, noActivity);
      scores = { ...result.domainScores };
    }

    // No activity means 0 award points each week → scores never change
    for (const key of DOMAIN_KEYS) {
      expect(scores[key]).toBe(60);
    }
  });
});
