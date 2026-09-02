/**
 * scoringEngine.test.js
 *
 * Comprehensive unit tests for the Pulse scoring engine.
 * Tests cover all exported functions and verify correctness against the
 * Balanced Life scoring specification (PDF §1–§14).
 *
 * The scoring model works as follows:
 *   1. Each of the 5 life domains gets a weekly DomainScore = 0.3R + 0.4A + 0.3C
 *      where R = reflection score, A = action score, C = consistency score.
 *   2. The observed DomainScore maps to an award point in the range [-2, +2].
 *   3. finalScore = previousScore + award, clamped to [0, 100].
 *   4. Global metrics aggregate all 5 domains:
 *      - LifeStrength   = average of domain scores
 *      - Evenness        = 100 - 2 × SD(domains), clamped to [0, 100]
 *      - BalancedLifeScore = 0.5 × LifeStrength + 0.5 × Evenness
 *
 * Test organisation:
 *   - Unit tests for each pure function (ratingToScore through calcAwardPoint)
 *   - computeDomainBreakdown covers all 4 activity cases (the core scoring logic)
 *   - computeDomainScore wrapper consistency checks
 *   - Global score functions (LifeStrength, Evenness, BalancedLifeScore)
 *   - Spec worked example (PDF §13) — end-to-end verification
 *   - Multi-week progression simulations
 *   - Edge cases (boundary scores, target variations)
 */

import {
  ratingToScore,
  calcReflectionScore,
  calcActionScore,
  calcConsistencyScore,
  calcDomainScore,
  calcAwardPoint,
  computeDomainScore,
  computeDomainBreakdown,
  calcLifeStrength,
  calcEvenness,
  calcBalancedLifeScore,
  computeGlobalScores,
  DOMAIN_KEYS,
} from './scoringEngine';

// ---------------------------------------------------------------------------
// ratingToScore
// Converts a 1–5 onboarding self-rating to a 20–100 internal score.
// Formula: score = rating × 20
// ---------------------------------------------------------------------------
describe('ratingToScore', () => {
  // Verify every valid onboarding rating maps to the correct score
  test('converts 1 to 20', () => expect(ratingToScore(1)).toBe(20));
  test('converts 2 to 40', () => expect(ratingToScore(2)).toBe(40));
  test('converts 3 to 60', () => expect(ratingToScore(3)).toBe(60));
  test('converts 4 to 80', () => expect(ratingToScore(4)).toBe(80));
  test('converts 5 to 100', () => expect(ratingToScore(5)).toBe(100));
});

// ---------------------------------------------------------------------------
// calcReflectionScore
// R_d = average of 1–5 daily reflection ratings, scaled to 0–100.
// Returns 0 when no reflections exist.
// ---------------------------------------------------------------------------
describe('calcReflectionScore', () => {
  // No reflections logged this week — should return 0 (triggers fallback in caller)
  test('returns 0 for empty array', () => {
    expect(calcReflectionScore([])).toBe(0);
  });

  // Guard against null/undefined from Firestore queries returning no data
  test('returns 0 for null/undefined', () => {
    expect(calcReflectionScore(null)).toBe(0);
    expect(calcReflectionScore(undefined)).toBe(0);
  });

  // Single-entry boundary values (min, mid, max ratings)
  test('single rating: 1 → 20', () => {
    expect(calcReflectionScore([1])).toBe(20);
  });

  test('single rating: 3 → 60', () => {
    expect(calcReflectionScore([3])).toBe(60);
  });

  test('single rating: 5 → 100', () => {
    expect(calcReflectionScore([5])).toBe(100);
  });

  // Multiple identical ratings — average equals each individual
  test('averages multiple ratings: [4, 4, 4] → 80', () => {
    expect(calcReflectionScore([4, 4, 4])).toBe(80);
  });

  // Mixed ratings — verifies averaging logic
  test('averages mixed ratings: [2, 4] → 60', () => {
    expect(calcReflectionScore([2, 4])).toBe(60);
  });

  test('[3, 4, 5] → avg 4.0 → 80', () => {
    expect(calcReflectionScore([3, 4, 5])).toBeCloseTo(80);
  });

  // Full-week worst case: all minimum ratings
  test('all 1s: [1, 1, 1, 1, 1, 1, 1] → 20', () => {
    expect(calcReflectionScore([1, 1, 1, 1, 1, 1, 1])).toBe(20);
  });

  // Full-week best case: all maximum ratings
  test('all 5s: [5, 5, 5, 5, 5, 5, 5] → 100', () => {
    expect(calcReflectionScore([5, 5, 5, 5, 5, 5, 5])).toBe(100);
  });

  // Realistic week with varied daily reflections
  test('single entry per day for a week: [1, 2, 3, 4, 5, 3, 4] → avg 3.14 → 62.86', () => {
    expect(calcReflectionScore([1, 2, 3, 4, 5, 3, 4])).toBeCloseTo(62.86);
  });
});

// ---------------------------------------------------------------------------
// calcActionScore
// A_d = (PointsEarned / WeeklyTarget) × 100, capped at 100.
// Each domain has its own weeklyTarget (e.g. Health=300, Productivity=250).
// ---------------------------------------------------------------------------
describe('calcActionScore', () => {
  // No actions logged — A = 0
  test('0 points → 0', () => {
    expect(calcActionScore(0, 200)).toBe(0);
  });

  // Standard proportion check
  test('half of target → 50', () => {
    expect(calcActionScore(100, 200)).toBe(50);
  });

  // Exactly meeting target → full marks
  test('exactly meets target → 100', () => {
    expect(calcActionScore(200, 200)).toBe(100);
  });

  // Exceeding target must be capped — no advantage to over-logging
  test('exceeds target → capped at 100', () => {
    expect(calcActionScore(400, 200)).toBe(100);
  });

  // Verify with Productivity's weeklyTarget of 250
  test('works with productivity target of 250', () => {
    expect(calcActionScore(125, 250)).toBe(50);
  });

  // Verify with Health's weeklyTarget of 300
  test('works with health target of 300', () => {
    expect(calcActionScore(150, 300)).toBe(50);
    expect(calcActionScore(300, 300)).toBe(100);
  });

  // Very low activity relative to target
  test('small fraction of target', () => {
    expect(calcActionScore(10, 200)).toBe(5);
  });

  // Just barely over target — still capped
  test('just over target still capped', () => {
    expect(calcActionScore(201, 200)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calcConsistencyScore
// C_d = (DaysWithMeaningfulActivity / 7) × 100, capped at 7 days.
// Rewards daily engagement throughout the week.
// ---------------------------------------------------------------------------
describe('calcConsistencyScore', () => {
  // No active days — C = 0
  test('0 active days → 0', () => {
    expect(calcConsistencyScore(0)).toBe(0);
  });

  // Individual day counts
  test('1 active day → ~14.29', () => {
    expect(calcConsistencyScore(1)).toBeCloseTo(14.29);
  });

  test('3 active days → ~42.86', () => {
    expect(calcConsistencyScore(3)).toBeCloseTo(42.86);
  });

  test('5 active days → ~71.43', () => {
    expect(calcConsistencyScore(5)).toBeCloseTo(71.43);
  });

  // Full week — perfect consistency
  test('7 active days → 100', () => {
    expect(calcConsistencyScore(7)).toBe(100);
  });

  // More than 7 days clamped (edge case from data bugs)
  test('more than 7 days → clamped to 100', () => {
    expect(calcConsistencyScore(10)).toBe(100);
  });

  // Structural check: every additional active day must increase the score
  test('each day from 0-7 monotonically increases', () => {
    let prev = -1;
    for (let d = 0; d <= 7; d++) {
      const score = calcConsistencyScore(d);
      expect(score).toBeGreaterThan(prev);
      prev = score;
    }
  });
});

// ---------------------------------------------------------------------------
// calcDomainScore
// DomainScore = 0.3R + 0.4A + 0.3C
// Action (A) has the highest weight — the spec rewards doing over reflecting.
// ---------------------------------------------------------------------------
describe('calcDomainScore', () => {
  // All max inputs → max score
  test('0.3R + 0.4A + 0.3C with equal inputs', () => {
    expect(calcDomainScore(100, 100, 100)).toBe(100);
  });

  // Manual calculation: 0.3×80 + 0.4×75 + 0.3×57 = 24 + 30 + 17.1 = 71.1
  test('calculates weighted average correctly', () => {
    expect(calcDomainScore(80, 75, 57)).toBeCloseTo(71.1);
  });

  // All zero inputs → zero score
  test('all zeros → 0', () => {
    expect(calcDomainScore(0, 0, 0)).toBe(0);
  });

  // Weight verification: A (0.4) should have more impact than R or C (0.3 each)
  test('action weight is highest: changing A has most impact', () => {
    const base = calcDomainScore(50, 50, 50);
    const higherA = calcDomainScore(50, 100, 50);
    const higherR = calcDomainScore(100, 50, 50);
    const higherC = calcDomainScore(50, 50, 100);
    expect(higherA - base).toBeGreaterThan(higherR - base);
    expect(higherA - base).toBeGreaterThan(higherC - base);
    // R and C should have identical impact (both 0.3)
    expect(higherR - base).toBeCloseTo(higherC - base);
  });

  // Isolated R and C produce equal contributions (both weight 0.3)
  test('R and C have equal weight (0.3 each)', () => {
    const onlyR = calcDomainScore(100, 0, 0);
    const onlyC = calcDomainScore(0, 0, 100);
    expect(onlyR).toBeCloseTo(onlyC);
    expect(onlyR).toBeCloseTo(30);
  });

  // Isolated A contribution: 0.4 × 100 = 40
  test('only A → 0.4 * 100 = 40', () => {
    expect(calcDomainScore(0, 100, 0)).toBeCloseTo(40);
  });

  // Cross-reference with the spec PDF §13 worked example (Spirituality row)
  test('spec values: R=70, A=75, C=71 → 72.3', () => {
    expect(calcDomainScore(70, 75, 71)).toBeCloseTo(72.3, 1);
  });
});

// ---------------------------------------------------------------------------
// calcAwardPoint
// Maps an observed 0–100 domain score to an award in the range [-2, +2].
// Formula: award = (observed / 100) × 4 - 2
// A neutral week (observed=50) yields 0 award — the score stays put.
// ---------------------------------------------------------------------------
describe('calcAwardPoint', () => {
  // Boundary values at 25-point intervals
  test('observed=0 → -2', () => {
    expect(calcAwardPoint(0)).toBe(-2);
  });

  test('observed=25 → -1', () => {
    expect(calcAwardPoint(25)).toBe(-1);
  });

  // Neutral point: no score change when observed = 50
  test('observed=50 → 0 (neutral week)', () => {
    expect(calcAwardPoint(50)).toBe(0);
  });

  test('observed=75 → +1', () => {
    expect(calcAwardPoint(75)).toBe(1);
  });

  test('observed=100 → +2', () => {
    expect(calcAwardPoint(100)).toBe(2);
  });

  // Spec PDF example value
  test('observed=90 → 1.6 (spec example)', () => {
    expect(calcAwardPoint(90)).toBeCloseTo(1.6);
  });

  // Verify the formula holds for all 10-point increments
  test('formula: (observed/100)*4 - 2 for any value', () => {
    for (const obs of [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      expect(calcAwardPoint(obs)).toBeCloseTo((obs / 100) * 4 - 2);
    }
  });

  // Linearity check: equal observed-score intervals produce equal award steps
  test('award is linear — equal step sizes', () => {
    const step = calcAwardPoint(50) - calcAwardPoint(25);
    expect(calcAwardPoint(75) - calcAwardPoint(50)).toBeCloseTo(step);
    expect(calcAwardPoint(100) - calcAwardPoint(75)).toBeCloseTo(step);
  });
});

// ---------------------------------------------------------------------------
// computeDomainScore
// Thin wrapper that calls computeDomainBreakdown and returns just finalScore.
// Tests here verify the wrapper works for each activity pattern.
// ---------------------------------------------------------------------------
describe('computeDomainScore', () => {
  const baseArgs = {
    previousScore: 60,
    weeklyTarget: 200,
  };

  // No events logged → score carries forward unchanged
  test('no activity → returns previousScore unchanged', () => {
    const score = computeDomainScore({
      ...baseArgs,
      reflections: [],
      actionPoints: 0,
      activeDays: 0,
    });
    expect(score).toBe(60);
  });

  // Perfect week: observed=100 → award=+2 → 60+2=62
  test('perfect week → score increases by +2', () => {
    const score = computeDomainScore({
      ...baseArgs,
      reflections: [5, 5, 5, 5, 5, 5, 5],
      actionPoints: 200,
      activeDays: 7,
    });
    expect(score).toBeCloseTo(62);
  });

  // Poor week: low activity produces negative award → score drops
  test('poor week (low actions, no reflections) → score decreases', () => {
    const score = computeDomainScore({
      previousScore: 60,
      reflections: [],
      actionPoints: 10,
      activeDays: 1,
      weeklyTarget: 200,
    });
    expect(score).toBeLessThan(60);
  });

  // Score must never go below 0 (Math.max clamp)
  test('score is clamped to 0 at minimum', () => {
    const score = computeDomainScore({
      previousScore: 0,
      reflections: [1],
      actionPoints: 1,
      activeDays: 1,
      weeklyTarget: 200,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  // Score must never exceed 100 (Math.min clamp)
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

  // When no reflections exist, R falls back to previousScore.
  // If previousScore matches the reflection rating (3 → 60), results are identical.
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

  // Reflection-only: the fixed bug — score must NOT change when only reflections are logged.
  // Previously, A=0 and C=0 would produce a low observed score and a negative award.
  test('reflection-only → score unchanged (no award applied)', () => {
    const score = computeDomainScore({
      previousScore: 60,
      reflections: [5, 5, 5],
      actionPoints: 0,
      activeDays: 0,
      weeklyTarget: 200,
    });
    expect(score).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// computeDomainBreakdown
// Core scoring function. Returns the full R/A/C/observed/award/finalScore breakdown.
//
// There are 4 activity cases:
//   Case 1: No activity       — no reflections, no actions → score frozen
//   Case 2: Reflection only   — reflections but no actions → R recorded, score frozen (bug fix)
//   Case 3: Actions + Refl.   — full scoring with award applied
//   Case 4: Actions only      — no reflections, R falls back → full scoring with award
// ---------------------------------------------------------------------------
describe('computeDomainBreakdown', () => {

  // ---- Case 1: No activity at all ----
  // When the user logs nothing for a week, the score carries forward unchanged.
  // This prevents score decay from inactivity (e.g. holidays).
  describe('Case 1: no activity (no reflections, no actions)', () => {
    test('finalScore = previousScore, zero award', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBe(60);
      expect(b.awardPoints).toBe(0);
      expect(b.actionScore).toBe(0);
      expect(b.consistencyScore).toBe(0);
      expect(b.observed).toBe(60);
    });

    // When no previousReflectionScore is stored, R falls back to previousScore
    test('reflectionScore falls back to previousScore when no previousReflectionScore', () => {
      const b = computeDomainBreakdown({
        previousScore: 70,
        reflections: [],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBe(70);
    });

    // When previousReflectionScore exists (from a prior week's reflections),
    // it is used instead of previousScore for a more accurate R fallback
    test('reflectionScore falls back to previousReflectionScore when available', () => {
      const b = computeDomainBreakdown({
        previousScore: 70,
        previousReflectionScore: 85,
        reflections: [],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBe(85);
    });
  });

  // ---- Case 2: Reflection only (the fixed bug) ----
  // Users who journal/reflect but don't log actions should NOT have their score penalised.
  // Before the fix, A=0 and C=0 would produce a very low observed score (≈6–30),
  // generating a negative award that unfairly decreased their domain score.
  // After the fix: the new R value is recorded (for future fallback), but no award is applied.
  describe('Case 2: reflection only (no actions) — fixed bug', () => {

    // Core fix verification: score must stay exactly at previousScore
    test('finalScore stays unchanged — no award applied', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [5, 5, 5],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBe(60);
      expect(b.awardPoints).toBe(0);
      expect(b.observed).toBe(60);
      expect(b.actionScore).toBe(0);
      expect(b.consistencyScore).toBe(0);
    });

    // The new R value IS computed from reflections (and persisted to lastReflectionScores)
    // even though no award is applied — this ensures future weeks use the fresh R
    test('reflectionScore is computed from new reflections', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [4, 4, 4],   // avg 4 × 20 = 80
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBe(80);
    });

    // Regression guard: low reflections must NOT cause a score decrease
    test('low reflections do NOT decrease the score', () => {
      const b = computeDomainBreakdown({
        previousScore: 80,
        reflections: [1, 1, 1],   // R = 20
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBe(80);
      expect(b.awardPoints).toBe(0);
      expect(b.reflectionScore).toBe(20);
    });

    // Symmetry guard: high reflections must NOT cause a score increase
    test('high reflections do NOT increase the score', () => {
      const b = computeDomainBreakdown({
        previousScore: 40,
        reflections: [5, 5, 5, 5, 5, 5, 5],   // R = 100
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBe(40);
      expect(b.awardPoints).toBe(0);
      expect(b.reflectionScore).toBe(100);
    });

    // Minimum valid reflection input (single entry)
    test('single reflection entry', () => {
      const b = computeDomainBreakdown({
        previousScore: 50,
        reflections: [3],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBe(50);
      expect(b.reflectionScore).toBe(60);
    });
  });

  // ---- Case 3: Actions + Reflections (normal full case) ----
  // This is the standard path: user both reflects and logs actions.
  // All three components (R, A, C) feed into the observed score,
  // which maps to an award point that adjusts the previous score.
  describe('Case 3: actions + reflections (full scoring)', () => {

    // Verify the complete math chain: R → A → C → observed → award → finalScore
    test('returns full R/A/C/observed/award/finalScore', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [4, 4, 4],   // R = 80
        actionPoints: 100,        // A = 100/200 × 100 = 50
        activeDays: 3,            // C = 3/7 × 100 ≈ 42.86
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBeCloseTo(80);
      expect(b.actionScore).toBeCloseTo(50);
      expect(b.consistencyScore).toBeCloseTo(42.86);
      // observed = 0.3×80 + 0.4×50 + 0.3×42.86 = 24 + 20 + 12.86 = 56.86
      const expectedObserved = 0.3 * 80 + 0.4 * 50 + 0.3 * 42.86;
      expect(b.observed).toBeCloseTo(expectedObserved);
      // award = (56.86/100)×4 - 2 ≈ 0.274
      const expectedAward = (expectedObserved / 100) * 4 - 2;
      expect(b.awardPoints).toBeCloseTo(expectedAward);
      expect(b.finalScore).toBeCloseTo(60 + expectedAward);
    });

    // Perfect week: all max inputs → observed=100 → award=+2
    test('perfect week: R=100, A=100, C=100 → award=+2', () => {
      const b = computeDomainBreakdown({
        previousScore: 50,
        reflections: [5, 5, 5, 5, 5, 5, 5],
        actionPoints: 200,
        activeDays: 7,
        weeklyTarget: 200,
      });
      expect(b.observed).toBeCloseTo(100);
      expect(b.awardPoints).toBeCloseTo(2);
      expect(b.finalScore).toBeCloseTo(52);
    });

    // Poor week: low inputs → observed < 50 → negative award → score decreases
    test('poor week: low R, A, C → negative award', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [1, 1],       // R = 20
        actionPoints: 20,          // A = 10
        activeDays: 1,             // C ≈ 14.29
        weeklyTarget: 200,
      });
      expect(b.observed).toBeLessThan(50);
      expect(b.awardPoints).toBeLessThan(0);
      expect(b.finalScore).toBeLessThan(60);
    });

    // Verify lower bound clamp: score cannot go below 0
    test('finalScore clamped at 0', () => {
      const b = computeDomainBreakdown({
        previousScore: 1,
        reflections: [1],
        actionPoints: 1,
        activeDays: 1,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBeGreaterThanOrEqual(0);
    });

    // Verify upper bound clamp: score cannot exceed 100
    test('finalScore clamped at 100', () => {
      const b = computeDomainBreakdown({
        previousScore: 99,
        reflections: [5, 5, 5, 5, 5, 5, 5],
        actionPoints: 200,
        activeDays: 7,
        weeklyTarget: 200,
      });
      expect(b.finalScore).toBeLessThanOrEqual(100);
    });
  });

  // ---- Case 4: Actions only (no reflections) ----
  // User logs actions but no reflections. R falls back to previousScore
  // (or previousReflectionScore if available). Full award is still applied.
  describe('Case 4: actions only (no reflections)', () => {

    // Default fallback: R = previousScore when no reflection history exists
    test('R falls back to previousScore', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [],
        actionPoints: 100,        // A = 50
        activeDays: 3,            // C ≈ 42.86
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBe(60);
      expect(b.actionScore).toBeCloseTo(50);
      expect(b.consistencyScore).toBeCloseTo(42.86);
    });

    // Preferred fallback: R = previousReflectionScore (from a prior week's reflections)
    test('R falls back to previousReflectionScore when available', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        previousReflectionScore: 80,
        reflections: [],
        actionPoints: 100,
        activeDays: 3,
        weeklyTarget: 200,
      });
      expect(b.reflectionScore).toBe(80);
    });

    // Unlike case 2 (reflection-only), actions-only DOES apply an award
    test('award is applied based on observed score', () => {
      const b = computeDomainBreakdown({
        previousScore: 60,
        reflections: [],
        actionPoints: 200,        // A = 100
        activeDays: 7,            // C = 100
        weeklyTarget: 200,
      });
      // R falls back to 60: observed = 0.3×60 + 0.4×100 + 0.3×100 = 88
      const expectedObserved = 0.3 * 60 + 0.4 * 100 + 0.3 * 100;
      expect(b.observed).toBeCloseTo(expectedObserved);
      expect(b.awardPoints).not.toBe(0);
      expect(b.finalScore).not.toBe(60);
    });

    // Verify that previousReflectionScore produces a higher R (and thus higher observed)
    // than falling back to previousScore when previousReflectionScore > previousScore
    test('actions-only with previousReflectionScore vs previousScore produces different R', () => {
      const withPrevRefl = computeDomainBreakdown({
        previousScore: 60,
        previousReflectionScore: 90,
        reflections: [],
        actionPoints: 100,
        activeDays: 3,
        weeklyTarget: 200,
      });
      const withoutPrevRefl = computeDomainBreakdown({
        previousScore: 60,
        reflections: [],
        actionPoints: 100,
        activeDays: 3,
        weeklyTarget: 200,
      });
      expect(withPrevRefl.reflectionScore).toBe(90);
      expect(withoutPrevRefl.reflectionScore).toBe(60);
      expect(withPrevRefl.observed).toBeGreaterThan(withoutPrevRefl.observed);
    });
  });

  // ---- Consistency with computeDomainScore wrapper ----
  // computeDomainScore is a thin wrapper that returns only finalScore.
  // These tests ensure the wrapper stays in sync with computeDomainBreakdown.
  describe('consistency with computeDomainScore wrapper', () => {
    test('finalScore matches computeDomainScore for full activity', () => {
      const args = {
        previousScore: 60,
        reflections: [5, 5, 5, 5, 5, 5, 5],
        actionPoints: 200,
        activeDays: 7,
        weeklyTarget: 200,
      };
      expect(computeDomainBreakdown(args).finalScore).toBeCloseTo(computeDomainScore(args));
    });

    test('finalScore matches computeDomainScore for no activity', () => {
      const args = {
        previousScore: 60,
        reflections: [],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      };
      expect(computeDomainBreakdown(args).finalScore).toBe(computeDomainScore(args));
    });

    test('finalScore matches computeDomainScore for reflection-only', () => {
      const args = {
        previousScore: 60,
        reflections: [4, 4],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      };
      expect(computeDomainBreakdown(args).finalScore).toBe(computeDomainScore(args));
    });

    test('finalScore matches computeDomainScore for actions-only', () => {
      const args = {
        previousScore: 60,
        reflections: [],
        actionPoints: 100,
        activeDays: 3,
        weeklyTarget: 200,
      };
      expect(computeDomainBreakdown(args).finalScore).toBeCloseTo(computeDomainScore(args));
    });
  });
});

// ---------------------------------------------------------------------------
// calcLifeStrength
// LifeStrength = average of all 5 domain scores.
// Measures overall life quality across all domains.
// ---------------------------------------------------------------------------
describe('calcLifeStrength', () => {
  // Uniform scores — average equals the common value
  test('all domains equal → returns that value', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]));
    expect(calcLifeStrength(scores)).toBe(60);
  });

  // Spec example values: (72.3 + 55.1 + 83.4 + 67.6 + 54.2) / 5 = 66.52
  test('averages correctly across 5 domains', () => {
    const scores = {
      spirituality:  72.3,
      relationships: 55.1,
      productivity:  83.4,
      health:        67.6,
      finance:       54.2,
    };
    expect(calcLifeStrength(scores)).toBeCloseTo(66.52);
  });

  // Boundary: all zeros
  test('all zeros → 0', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]));
    expect(calcLifeStrength(scores)).toBe(0);
  });

  // Boundary: all max
  test('all max → 100', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 100]));
    expect(calcLifeStrength(scores)).toBe(100);
  });

  // One strong domain, rest neglected: 100/5 = 20
  test('one high, rest low', () => {
    const scores = {
      spirituality: 100,
      relationships: 0,
      productivity: 0,
      health: 0,
      finance: 0,
    };
    expect(calcLifeStrength(scores)).toBe(20);
  });

  // Missing domain key defaults to 0 via nullish coalescing
  test('missing domain defaults to 0', () => {
    const scores = {
      spirituality: 50,
      relationships: 50,
      productivity: 50,
      health: 50,
      // finance is missing → treated as 0
    };
    // (50 + 50 + 50 + 50 + 0) / 5 = 40
    expect(calcLifeStrength(scores)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// calcEvenness
// Evenness = 100 - 2 × SD(D1..D5), clamped to [0, 100].
// Rewards balanced investment across all domains.
// SD = 0 when all scores are equal → Evenness = 100.
// ---------------------------------------------------------------------------
describe('calcEvenness', () => {
  // All equal → SD = 0 → Evenness = 100
  test('all equal → 100 (perfect evenness)', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 70]));
    expect(calcEvenness(scores)).toBe(100);
  });

  // Greater spread → higher SD → lower evenness
  test('higher spread → lower evenness', () => {
    const even   = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 60]));
    const uneven = { spirituality: 95, relationships: 20, productivity: 95, health: 20, finance: 95 };
    expect(calcEvenness(even)).toBeGreaterThan(calcEvenness(uneven));
  });

  // Extreme spread: should not go below 0 (Math.max clamp)
  test('result is clamped to 0 when spread is extreme', () => {
    const extreme = { spirituality: 100, relationships: 0, productivity: 100, health: 0, finance: 100 };
    expect(calcEvenness(extreme)).toBeGreaterThanOrEqual(0);
  });

  // All zeros: SD = 0 → Evenness = 100 (uniformly low is still balanced)
  test('all zeros → 100 (no variance)', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]));
    expect(calcEvenness(scores)).toBe(100);
  });

  // All max: SD = 0 → Evenness = 100 (uniformly high is still balanced)
  test('all max → 100 (no variance)', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 100]));
    expect(calcEvenness(scores)).toBe(100);
  });

  // One outlier domain should measurably reduce evenness
  test('one outlier reduces evenness', () => {
    const balanced = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 70]));
    const oneOutlier = { ...balanced, finance: 10 };
    expect(calcEvenness(oneOutlier)).toBeLessThan(calcEvenness(balanced));
  });

  // Cross-reference with spec PDF §13 worked example
  test('spec example: domains 72.3, 55.1, 83.4, 67.6, 54.2 → ~78.3', () => {
    const scores = {
      spirituality:  72.3,
      relationships: 55.1,
      productivity:  83.4,
      health:        67.6,
      finance:       54.2,
    };
    expect(calcEvenness(scores)).toBeCloseTo(78.3, 0);
  });
});

// ---------------------------------------------------------------------------
// calcBalancedLifeScore
// BalancedLifeScore = 0.5 × LifeStrength + 0.5 × Evenness
// Equal weight to strength (how high) and balance (how even).
// ---------------------------------------------------------------------------
describe('calcBalancedLifeScore', () => {
  // Equal inputs → output equals both
  test('equal inputs → same as both inputs', () => {
    expect(calcBalancedLifeScore(70, 70)).toBe(70);
  });

  // Standard weighted average: 0.5×60 + 0.5×80 = 70
  test('0.5 × lifeStrength + 0.5 × evenness', () => {
    expect(calcBalancedLifeScore(60, 80)).toBe(70);
  });

  // Low evenness drags down the overall score even if strength is high
  test('low evenness pulls down a high life strength', () => {
    expect(calcBalancedLifeScore(90, 40)).toBe(65);
  });

  // Boundary: both zero → 0
  test('both zero → 0', () => {
    expect(calcBalancedLifeScore(0, 0)).toBe(0);
  });

  // Boundary: both max → 100
  test('both max → 100', () => {
    expect(calcBalancedLifeScore(100, 100)).toBe(100);
  });

  // High evenness can compensate for low strength
  test('high evenness + low strength', () => {
    expect(calcBalancedLifeScore(20, 100)).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// computeGlobalScores
// Integration of all three global metrics. Takes a { domain: score } map
// and returns { lifeStrength, evenness, balancedLifeScore }.
// ---------------------------------------------------------------------------
describe('computeGlobalScores', () => {
  // Shape check: all three fields must be present
  test('returns lifeStrength, evenness, balancedLifeScore', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 70]));
    const result = computeGlobalScores(scores);
    expect(result).toHaveProperty('lifeStrength');
    expect(result).toHaveProperty('evenness');
    expect(result).toHaveProperty('balancedLifeScore');
  });

  // Uniform domains: LS = 75, E = 100 (no variance), BLS = 0.5×75 + 0.5×100 = 87.5
  test('all equal domains → lifeStrength equals each domain score', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 75]));
    const result = computeGlobalScores(scores);
    expect(result.lifeStrength).toBe(75);
    expect(result.evenness).toBe(100);
    expect(result.balancedLifeScore).toBe(87.5);
  });

  // Spec example values — verify the full computation chain matches
  test('varied domains → correct computation', () => {
    const scores = {
      spirituality:  72.3,
      relationships: 55.1,
      productivity:  83.4,
      health:        67.6,
      finance:       54.2,
    };
    const result = computeGlobalScores(scores);
    expect(result.lifeStrength).toBeCloseTo(66.52);
    expect(result.evenness).toBeCloseTo(78.3, 0);
    // BLS must equal 0.5 × LS + 0.5 × E
    expect(result.balancedLifeScore).toBeCloseTo(0.5 * result.lifeStrength + 0.5 * result.evenness);
  });

  // Edge case: all zeros → LS=0, E=100 (no variance), BLS=50
  test('all zeros', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]));
    const result = computeGlobalScores(scores);
    expect(result.lifeStrength).toBe(0);
    expect(result.evenness).toBe(100);
    expect(result.balancedLifeScore).toBe(50);
  });

  // Extreme imbalance: one domain maxed, rest zero → low LS, very low E
  test('single domain extreme, rest zero', () => {
    const scores = Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]));
    scores.spirituality = 100;
    const result = computeGlobalScores(scores);
    expect(result.lifeStrength).toBe(20);
    expect(result.evenness).toBeLessThan(50);
    expect(result.balancedLifeScore).toBeLessThan(35);
  });
});

// ---------------------------------------------------------------------------
// DOMAIN_KEYS
// The canonical list of 5 life domains. Order matters for consistency.
// ---------------------------------------------------------------------------
describe('DOMAIN_KEYS', () => {
  test('contains exactly 5 domains', () => {
    expect(DOMAIN_KEYS).toHaveLength(5);
  });

  test('contains the correct domains', () => {
    expect(DOMAIN_KEYS).toEqual([
      'spirituality',
      'relationships',
      'productivity',
      'health',
      'finance',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Spec worked example (PDF §13) — full end-to-end verification
// Uses the exact R, A, C inputs from the spec table and verifies every
// intermediate and final value matches the documented expected results.
// ---------------------------------------------------------------------------
describe('spec worked example', () => {
  test('reproduces the worked example from the scoring spec', () => {
    // Input R, A, C values taken directly from the spec table
    const spirituality  = calcDomainScore(70, 75, 71);  // → 72.3
    const relationships = calcDomainScore(60, 50, 57);  // → 55.1
    const productivity  = calcDomainScore(80, 84, 86);  // → 83.4
    const health        = calcDomainScore(65, 67, 71);  // → 67.6
    const finance       = calcDomainScore(55, 62, 43);  // → 54.2

    // Verify each domain score matches the spec
    expect(spirituality).toBeCloseTo(72.3, 1);
    expect(relationships).toBeCloseTo(55.1, 1);
    expect(productivity).toBeCloseTo(83.4, 1);
    expect(health).toBeCloseTo(67.6, 1);
    expect(finance).toBeCloseTo(54.2, 0);

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

// ---------------------------------------------------------------------------
// Multi-week score progression
// Simulates multiple weeks to verify long-term scoring behaviour:
// - Consistently good weeks push the score toward 100
// - Consistently poor weeks push the score toward 0
// - Neutral activity keeps the score stable
// - No activity or reflection-only activity freezes the score
// ---------------------------------------------------------------------------
describe('multi-week score progression', () => {

  // 25 perfect weeks: award = +2/week, starting from 50 → reaches 100 and stays clamped
  test('repeated perfect weeks increase score toward 100', () => {
    let score = 50;
    for (let week = 0; week < 25; week++) {
      const b = computeDomainBreakdown({
        previousScore: score,
        reflections: [5, 5, 5, 5, 5, 5, 5],
        actionPoints: 200,
        activeDays: 7,
        weeklyTarget: 200,
      });
      score = b.finalScore;
    }
    expect(score).toBe(100);
  });

  // 35 poor weeks: R=20 (from [1]), A≈0.5, C≈14.29 → observed≈10.5 → award≈-1.58/week
  // Starting from 50, takes ~32 weeks to reach 0 with clamping
  test('repeated poor weeks decrease score toward 0', () => {
    let score = 50;
    for (let week = 0; week < 35; week++) {
      const b = computeDomainBreakdown({
        previousScore: score,
        reflections: [1],
        actionPoints: 1,
        activeDays: 1,
        weeklyTarget: 200,
      });
      score = b.finalScore;
    }
    expect(score).toBe(0);
  });

  // Near-neutral activity: observed ≈ 47 → award ≈ -0.13 → minimal change
  test('neutral weeks (observed ≈ 50) keep score stable', () => {
    const initial = 50;
    const b = computeDomainBreakdown({
      previousScore: initial,
      reflections: [3, 3],        // R = 60
      actionPoints: 80,           // A = 40
      activeDays: 3,              // C ≈ 42.86
      weeklyTarget: 200,
    });
    // observed ≈ 0.3×60 + 0.4×40 + 0.3×42.86 ≈ 46.86 → award ≈ -0.13
    expect(Math.abs(b.finalScore - initial)).toBeLessThan(1);
  });

  // No activity: score must remain perfectly frozen across any number of weeks
  test('no-activity weeks keep score frozen', () => {
    let score = 75;
    for (let week = 0; week < 10; week++) {
      const b = computeDomainBreakdown({
        previousScore: score,
        reflections: [],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      score = b.finalScore;
    }
    expect(score).toBe(75);
  });

  // Reflection-only: after the bug fix, score must remain perfectly frozen
  test('reflection-only weeks keep score frozen', () => {
    let score = 65;
    for (let week = 0; week < 10; week++) {
      const b = computeDomainBreakdown({
        previousScore: score,
        reflections: [4, 4, 4],
        actionPoints: 0,
        activeDays: 0,
        weeklyTarget: 200,
      });
      score = b.finalScore;
    }
    expect(score).toBe(65);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// Boundary conditions and unusual inputs that could reveal clamping
// or calculation issues.
// ---------------------------------------------------------------------------
describe('edge cases', () => {

  // Starting from absolute zero: max activity should push score to exactly 2
  test('previousScore at 0 with max activity → increases to 2', () => {
    const b = computeDomainBreakdown({
      previousScore: 0,
      reflections: [5, 5, 5, 5, 5, 5, 5],
      actionPoints: 200,
      activeDays: 7,
      weeklyTarget: 200,
    });
    // award = +2, 0 + 2 = 2
    expect(b.finalScore).toBe(2);
  });

  // Starting at max: max activity should keep score at 100 (clamped)
  test('previousScore at 100 with max activity → stays 100', () => {
    const b = computeDomainBreakdown({
      previousScore: 100,
      reflections: [5, 5, 5, 5, 5, 5, 5],
      actionPoints: 200,
      activeDays: 7,
      weeklyTarget: 200,
    });
    // award = +2, min(100, 100 + 2) = 100
    expect(b.finalScore).toBe(100);
  });

  // Starting at max with poor activity: score must decrease
  test('previousScore at 100 with poor activity → decreases', () => {
    const b = computeDomainBreakdown({
      previousScore: 100,
      reflections: [1],
      actionPoints: 1,
      activeDays: 1,
      weeklyTarget: 200,
    });
    expect(b.finalScore).toBeLessThan(100);
  });

  // Very high weekly target makes it nearly impossible to max out A
  test('very high weeklyTarget makes action score very low', () => {
    const b = computeDomainBreakdown({
      previousScore: 50,
      reflections: [3],
      actionPoints: 50,           // A = 50/1000 × 100 = 5
      activeDays: 3,
      weeklyTarget: 1000,
    });
    expect(b.actionScore).toBe(5);
  });

  // Same actions but different weeklyTargets should produce different A scores
  // and therefore different final scores — verifies domain-specific target handling
  test('different weeklyTargets per domain produce different scores', () => {
    const easy = computeDomainBreakdown({
      previousScore: 50,
      reflections: [3],
      actionPoints: 100,          // A = 100/100 = 100
      activeDays: 3,
      weeklyTarget: 100,
    });
    const hard = computeDomainBreakdown({
      previousScore: 50,
      reflections: [3],
      actionPoints: 100,          // A = 100/300 ≈ 33.3
      activeDays: 3,
      weeklyTarget: 300,
    });
    expect(easy.actionScore).toBeGreaterThan(hard.actionScore);
    expect(easy.finalScore).toBeGreaterThan(hard.finalScore);
  });
});
