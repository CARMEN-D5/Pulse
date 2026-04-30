import {
  ratingToScore,
  calcReflectionScore,
  calcActionScore,
  calcConsistencyScore,
  calcDomainScore,
  calcAwardPoint,
  computeDomainScore,
  calcLifeStrength,
  calcEvenness,
  calcBalancedLifeScore,
  computeGlobalScores,
  DOMAIN_KEYS,
} from './scoringEngine';

// ---------------------------------------------------------------------------
// ratingToScore
// ---------------------------------------------------------------------------
describe('ratingToScore', () => {
  test('converts 1 to 20', () => expect(ratingToScore(1)).toBe(20));
  test('converts 3 to 60', () => expect(ratingToScore(3)).toBe(60));
  test('converts 5 to 100', () => expect(ratingToScore(5)).toBe(100));
});

// ---------------------------------------------------------------------------
// calcReflectionScore
// ---------------------------------------------------------------------------
describe('calcReflectionScore', () => {
  test('returns 0 for empty array', () => {
    expect(calcReflectionScore([])).toBe(0);
  });

  test('single rating: 3 → 60', () => {
    expect(calcReflectionScore([3])).toBe(60);
  });

  test('averages multiple ratings: [4, 4, 4] → 80', () => {
    expect(calcReflectionScore([4, 4, 4])).toBe(80);
  });

  test('averages mixed ratings: [2, 4] → 60', () => {
    expect(calcReflectionScore([2, 4])).toBe(60);
  });

  test('[3, 4, 5] → avg 4.0 → 80', () => {
    expect(calcReflectionScore([3, 4, 5])).toBeCloseTo(80);
  });
});

// ---------------------------------------------------------------------------
// calcActionScore
// ---------------------------------------------------------------------------
describe('calcActionScore', () => {
  test('0 points → 0', () => {
    expect(calcActionScore(0, 200)).toBe(0);
  });

  test('half of target → 50', () => {
    expect(calcActionScore(100, 200)).toBe(50);
  });

  test('exactly meets target → 100', () => {
    expect(calcActionScore(200, 200)).toBe(100);
  });

  test('exceeds target → capped at 100', () => {
    expect(calcActionScore(400, 200)).toBe(100);
  });

  test('works with productivity target of 250', () => {
    expect(calcActionScore(125, 250)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calcConsistencyScore
// ---------------------------------------------------------------------------
describe('calcConsistencyScore', () => {
  test('0 active days → 0', () => {
    expect(calcConsistencyScore(0)).toBe(0);
  });

  test('7 active days → 100', () => {
    expect(calcConsistencyScore(7)).toBe(100);
  });

  test('3 active days → ~42.86', () => {
    expect(calcConsistencyScore(3)).toBeCloseTo(42.86);
  });

  test('more than 7 days → clamped to 100', () => {
    expect(calcConsistencyScore(10)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calcDomainScore
// ---------------------------------------------------------------------------
describe('calcDomainScore', () => {
  test('0.3R + 0.4A + 0.3C with equal inputs', () => {
    expect(calcDomainScore(100, 100, 100)).toBe(100);
  });

  test('calculates weighted average correctly', () => {
    // 0.3*80 + 0.4*75 + 0.3*57 = 24 + 30 + 17.1 = 71.1
    expect(calcDomainScore(80, 75, 57)).toBeCloseTo(71.1);
  });

  test('all zeros → 0', () => {
    expect(calcDomainScore(0, 0, 0)).toBe(0);
  });

  test('action weight is highest: changing A has most impact', () => {
    const base = calcDomainScore(50, 50, 50);
    const higherA = calcDomainScore(50, 100, 50);
    const higherR = calcDomainScore(100, 50, 50);
    expect(higherA - base).toBeGreaterThan(higherR - base);
  });
});

// ---------------------------------------------------------------------------
// calcAwardPoint
// ---------------------------------------------------------------------------
describe('calcAwardPoint', () => {
  test('observed=100 → +2', () => {
    expect(calcAwardPoint(100)).toBe(2);
  });

  test('observed=50 → 0 (neutral week)', () => {
    expect(calcAwardPoint(50)).toBe(0);
  });

  test('observed=0 → -2', () => {
    expect(calcAwardPoint(0)).toBe(-2);
  });

  test('observed=90 → 1.6 (spec example)', () => {
    expect(calcAwardPoint(90)).toBeCloseTo(1.6);
  });

  test('observed=75 → +1', () => {
    expect(calcAwardPoint(75)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeDomainScore
// ---------------------------------------------------------------------------
describe('computeDomainScore', () => {
  const baseArgs = {
    previousScore: 60,
    weeklyTarget: 200,
  };

  test('no activity → returns previousScore unchanged', () => {
    const score = computeDomainScore({
      ...baseArgs,
      reflections: [],
      actionPoints: 0,
      activeDays: 0,
    });
    expect(score).toBe(60);
  });

  test('perfect week → score increases by +2', () => {
    const score = computeDomainScore({
      ...baseArgs,
      reflections: [5, 5, 5, 5, 5, 5, 5],
      actionPoints: 200,
      activeDays: 7,
    });
    expect(score).toBeCloseTo(62); // 60 + 2
  });

  test('poor week (low actions, no reflections) → score decreases', () => {
    const score = computeDomainScore({
      previousScore: 60,
      reflections: [],
      actionPoints: 10,  // very low
      activeDays: 1,
      weeklyTarget: 200,
    });
    expect(score).toBeLessThan(60);
  });

  test('score is clamped to 0 at minimum', () => {
    const score = computeDomainScore({
      previousScore: 1,
      reflections: [1],
      actionPoints: 0,
      activeDays: 0,
      weeklyTarget: 200,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('score is clamped to 100 at maximum', () => {
    const score = computeDomainScore({
      previousScore: 99,
      reflections: [5, 5, 5, 5, 5, 5, 5],
      actionPoints: 200,
      activeDays: 7,
      weeklyTarget: 200,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  test('no reflections but has actions → R falls back to previousScore', () => {
    const withReflections = computeDomainScore({
      ...baseArgs,
      reflections: [3],   // R = 60 (same as previousScore)
      actionPoints: 100,
      activeDays: 3,
    });
    const withoutReflections = computeDomainScore({
      ...baseArgs,
      reflections: [],    // R falls back to previousScore = 60
      actionPoints: 100,
      activeDays: 3,
    });
    expect(withReflections).toBeCloseTo(withoutReflections);
  });
});

// ---------------------------------------------------------------------------
// calcLifeStrength
// ---------------------------------------------------------------------------
describe('calcLifeStrength', () => {
  test('all domains equal → returns that value', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]));
    expect(calcLifeStrength(scores)).toBe(60);
  });

  test('averages correctly across 5 domains', () => {
    const scores = {
      spirituality:  72.3,
      relationships: 55.1,
      productivity:  83.4,
      health:        67.6,
      finance:       54.2,
    };
    // (72.3 + 55.1 + 83.4 + 67.6 + 54.2) / 5 = 66.52
    expect(calcLifeStrength(scores)).toBeCloseTo(66.52);
  });
});

// ---------------------------------------------------------------------------
// calcEvenness
// ---------------------------------------------------------------------------
describe('calcEvenness', () => {
  test('all equal → 100 (perfect evenness)', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 70]));
    expect(calcEvenness(scores)).toBe(100);
  });

  test('higher spread → lower evenness', () => {
    const even   = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]));
    const uneven = { spirituality: 95, relationships: 20, productivity: 95, health: 20, finance: 95 };
    expect(calcEvenness(even)).toBeGreaterThan(calcEvenness(uneven));
  });

  test('result is clamped to 0 when spread is extreme', () => {
    const extreme = { spirituality: 100, relationships: 0, productivity: 100, health: 0, finance: 100 };
    expect(calcEvenness(extreme)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// calcBalancedLifeScore
// ---------------------------------------------------------------------------
describe('calcBalancedLifeScore', () => {
  test('equal inputs → same as both inputs', () => {
    expect(calcBalancedLifeScore(70, 70)).toBe(70);
  });

  test('0.5 × lifeStrength + 0.5 × evenness', () => {
    expect(calcBalancedLifeScore(60, 80)).toBe(70);
  });

  test('low evenness pulls down a high life strength', () => {
    expect(calcBalancedLifeScore(90, 40)).toBe(65);
  });
});

// ---------------------------------------------------------------------------
// computeGlobalScores
// ---------------------------------------------------------------------------
describe('computeGlobalScores', () => {
  test('returns lifeStrength, evenness, balancedLifeScore', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 70]));
    const result = computeGlobalScores(scores);
    expect(result).toHaveProperty('lifeStrength');
    expect(result).toHaveProperty('evenness');
    expect(result).toHaveProperty('balancedLifeScore');
  });

  test('all equal domains → lifeStrength equals each domain score', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 75]));
    const result = computeGlobalScores(scores);
    expect(result.lifeStrength).toBe(75);
    expect(result.evenness).toBe(100);
    expect(result.balancedLifeScore).toBe(87.5);
  });
});

// ---------------------------------------------------------------------------
// Spec worked example (PDF §13) — end-to-end verification
// ---------------------------------------------------------------------------
describe('spec worked example', () => {
  test('reproduces the worked example from the scoring spec', () => {
    // Input R, A, C values taken directly from the spec table
    const spirituality  = calcDomainScore(70, 75, 71);  // → 72.3
    const relationships = calcDomainScore(60, 50, 57);  // → 55.1
    const productivity  = calcDomainScore(80, 84, 86);  // → 83.4
    const health        = calcDomainScore(65, 67, 71);  // → 67.6
    const finance       = calcDomainScore(55, 62, 43);  // → 54.2

    expect(spirituality).toBeCloseTo(72.3, 1);
    expect(relationships).toBeCloseTo(55.1, 1);
    expect(productivity).toBeCloseTo(83.4, 1);
    expect(health).toBeCloseTo(67.6, 1);

    const domainScores = { spirituality, relationships, productivity, health, finance };
    const { lifeStrength, evenness, balancedLifeScore } = computeGlobalScores(domainScores);

    // Spec says LifeStrength ≈ 66.6
    expect(lifeStrength).toBeCloseTo(66.6, 0);
    // Spec says Evenness ≈ 78.3
    expect(evenness).toBeCloseTo(78.3, 0);
    // Spec says BalancedLifeScore ≈ 72.5
    expect(balancedLifeScore).toBeCloseTo(72.5, 0);
  });
});
