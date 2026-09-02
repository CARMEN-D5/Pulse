/**
 * Standalone scoring simulation runner.
 * Prints score progression tables for all user profiles across
 * 14 days (2 weeks), 1 month (4 weeks), and 2 months (8 weeks).
 *
 * Usage:  node src/scoring/runSimulation.mjs
 */

// ---------------------------------------------------------------------------
// Inline the scoring engine (avoids ESM/CJS import issues)
// ---------------------------------------------------------------------------

const DOMAINS = {
  spirituality:  { weeklyTarget: 200 },
  relationships: { weeklyTarget: 200 },
  productivity:  { weeklyTarget: 250 },
  health:        { weeklyTarget: 300 },
  finance:       { weeklyTarget: 200 },
};
const DOMAIN_KEYS = ['spirituality', 'relationships', 'productivity', 'health', 'finance'];

function ratingToScore(rating) { return rating * 20; }

function calcReflectionScore(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return avg * 20;
}

function calcActionScore(pointsEarned, weeklyTarget) {
  return Math.min(100, (pointsEarned / weeklyTarget) * 100);
}

function calcConsistencyScore(daysActive) {
  return (Math.min(7, daysActive) / 7) * 100;
}

function calcDomainScore(R, A, C) {
  return 0.3 * R + 0.4 * A + 0.3 * C;
}

function calcAwardPoint(observedScore) {
  return (observedScore / 100) * 4 - 2;
}

function stdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function calcLifeStrength(domainScores) {
  const vals = DOMAIN_KEYS.map(k => domainScores[k] ?? 0);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function calcEvenness(domainScores) {
  const vals = DOMAIN_KEYS.map(k => domainScores[k] ?? 0);
  return Math.max(0, Math.min(100, 100 - 2 * stdDev(vals)));
}

function calcBalancedLifeScore(lifeStrength, evenness) {
  return 0.5 * lifeStrength + 0.5 * evenness;
}

function computeDomainBreakdown({ previousScore, previousReflectionScore, reflections, actionPoints, activeDays, weeklyTarget }) {
  const hasActions = actionPoints > 0;
  const hasReflections = reflections.length > 0;
  const rFallback = previousReflectionScore ?? previousScore;

  if (!hasActions && !hasReflections) {
    return { reflectionScore: rFallback, actionScore: 0, consistencyScore: 0, observed: previousScore, awardPoints: 0, finalScore: previousScore };
  }

  const R = hasReflections ? calcReflectionScore(reflections) : rFallback;

  if (!hasActions) {
    return { reflectionScore: R, actionScore: 0, consistencyScore: 0, observed: previousScore, awardPoints: 0, finalScore: previousScore };
  }

  const A = calcActionScore(actionPoints, weeklyTarget);
  const C = calcConsistencyScore(activeDays);
  const observed = calcDomainScore(R, A, C);
  const award = calcAwardPoint(observed);
  const finalScore = Math.max(0, Math.min(100, previousScore + award));

  return { reflectionScore: R, actionScore: A, consistencyScore: C, observed, awardPoints: award, finalScore };
}

function computeGlobalScores(domainScores) {
  const lifeStrength = calcLifeStrength(domainScores);
  const evenness = calcEvenness(domainScores);
  const balancedLifeScore = calcBalancedLifeScore(lifeStrength, evenness);
  return { lifeStrength, evenness, balancedLifeScore };
}

// ---------------------------------------------------------------------------
// Simulation engine
// ---------------------------------------------------------------------------

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
    history.push({ week: w + 1, domainScores: { ...currentScores }, breakdowns, ...global });
  }

  return history;
}

// ---------------------------------------------------------------------------
// User profiles
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

function reflectionOnlyWeek() {
  return {
    spirituality:  { reflections: [4, 4, 5, 4, 3, 4, 4], actionPoints: 0, activeDays: 0 },
    relationships: { reflections: [3, 4, 4, 3, 4, 3, 4], actionPoints: 0, activeDays: 0 },
    productivity:  { reflections: [3, 3, 4, 3, 4, 3, 3], actionPoints: 0, activeDays: 0 },
    health:        { reflections: [4, 3, 3, 4, 4, 3, 4], actionPoints: 0, activeDays: 0 },
    finance:       { reflections: [3, 3, 4, 3, 3, 3, 3], actionPoints: 0, activeDays: 0 },
  };
}

const NO_ACTIVITY = Object.fromEntries(
  DOMAIN_KEYS.map(k => [k, { reflections: [], actionPoints: 0, activeDays: 0 }])
);

function generateWeeks(n, patternFn) {
  return Array.from({ length: n }, (_, i) => patternFn(i + 1));
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printHeader(title) {
  console.log('\n' + '='.repeat(90));
  console.log(`  ${title}`);
  console.log('='.repeat(90));
  console.log('Week | Spirit | Relat  | Produc | Health | Finance | LS     | Even   | BLS');
  console.log('-'.repeat(90));
}

function printRow(e) {
  const d = e.domainScores;
  console.log(
    `W${String(e.week).padStart(2)}  ` +
    `| ${d.spirituality.toFixed(1).padStart(6)} ` +
    `| ${d.relationships.toFixed(1).padStart(6)} ` +
    `| ${d.productivity.toFixed(1).padStart(6)} ` +
    `| ${d.health.toFixed(1).padStart(6)} ` +
    `| ${d.finance.toFixed(1).padStart(7)} ` +
    `| ${e.lifeStrength.toFixed(1).padStart(6)} ` +
    `| ${e.evenness.toFixed(1).padStart(6)} ` +
    `| ${e.balancedLifeScore.toFixed(1).padStart(6)}`
  );
}

function printHistory(history, title) {
  printHeader(title);
  for (const e of history) printRow(e);
}

function printBreakdownRow(week, key, b) {
  console.log(
    `  W${String(week).padStart(2)} ${key.padEnd(14)} ` +
    `R=${b.reflectionScore.toFixed(1).padStart(5)}  ` +
    `A=${b.actionScore.toFixed(1).padStart(5)}  ` +
    `C=${b.consistencyScore.toFixed(1).padStart(5)}  ` +
    `Obs=${b.observed.toFixed(1).padStart(5)}  ` +
    `Award=${b.awardPoints >= 0 ? '+' : ''}${b.awardPoints.toFixed(2).padStart(5)}  ` +
    `Final=${b.finalScore.toFixed(1).padStart(5)}`
  );
}

// ---------------------------------------------------------------------------
// Run simulations
// ---------------------------------------------------------------------------

const baseline = { spirituality: 3, relationships: 3, productivity: 3, health: 3, finance: 3 };

console.log('\n' + '#'.repeat(90));
console.log('#  PULSE SCORING SIMULATION');
console.log('#  Baseline: all domains rated 3 (score = 60)');
console.log('#  Formula: DomainScore = 0.3R + 0.4A + 0.3C');
console.log('#  Award = (Observed/100) × 4 − 2   (range: −2 to +2)');
console.log('#  FinalScore = PreviousScore + Award  (clamped 0–100)');
console.log('#  BLS = 0.5 × LifeStrength + 0.5 × Evenness');
console.log('#'.repeat(90));

// --- 14-DAY (2 WEEKS) ---
console.log('\n\n>>> 14-DAY SIMULATIONS (2 WEEKS) <<<');

const profiles2w = [
  { name: 'Dedicated User',       data: generateWeeks(2, () => dedicatedWeek()) },
  { name: 'Casual User',          data: generateWeeks(2, (w) => casualWeek(w)) },
  { name: 'Improving User',       data: generateWeeks(2, (w) => improvingWeek(w)) },
  { name: 'Declining User',       data: generateWeeks(2, (w) => decliningWeek(w)) },
  { name: 'Unbalanced User',      data: generateWeeks(2, () => unbalancedWeek()) },
  { name: 'Reflection-only User', data: generateWeeks(2, () => reflectionOnlyWeek()) },
];

const results2w = [];
for (const p of profiles2w) {
  const history = simulate({ baseline, weeklyData: p.data });
  printHistory(history, `${p.name} — 14 Days`);
  results2w.push({ name: p.name, final: history[history.length - 1] });
}

// --- 1 MONTH (4 WEEKS) ---
console.log('\n\n>>> 1-MONTH SIMULATIONS (4 WEEKS) <<<');

const profiles4w = [
  { name: 'Dedicated User',       data: generateWeeks(4, () => dedicatedWeek()) },
  { name: 'Casual User',          data: generateWeeks(4, (w) => casualWeek(w)) },
  { name: 'Improving User',       data: generateWeeks(4, (w) => improvingWeek(w)) },
  { name: 'Declining User',       data: generateWeeks(4, (w) => decliningWeek(w)) },
  { name: 'Unbalanced User',      data: generateWeeks(4, () => unbalancedWeek()) },
  { name: 'Reflection-only User', data: generateWeeks(4, () => reflectionOnlyWeek()) },
];

const results4w = [];
for (const p of profiles4w) {
  const history = simulate({ baseline, weeklyData: p.data });
  printHistory(history, `${p.name} — 1 Month`);
  results4w.push({ name: p.name, final: history[history.length - 1] });
}

// --- 2 MONTHS (8 WEEKS) ---
console.log('\n\n>>> 2-MONTH SIMULATIONS (8 WEEKS) <<<');

const profiles8w = [
  { name: 'Dedicated User',       data: generateWeeks(8, () => dedicatedWeek()) },
  { name: 'Casual User',          data: generateWeeks(8, (w) => casualWeek(w)) },
  { name: 'Improving User',       data: generateWeeks(8, (w) => improvingWeek(w)) },
  { name: 'Declining User',       data: generateWeeks(8, (w) => decliningWeek(w)) },
  { name: 'Unbalanced User',      data: generateWeeks(8, () => unbalancedWeek()) },
  { name: 'Reflection-only User', data: generateWeeks(8, () => reflectionOnlyWeek()) },
  { name: 'Active→Inactive',      data: [...generateWeeks(4, () => dedicatedWeek()), ...generateWeeks(4, () => NO_ACTIVITY)] },
];

const results8w = [];
for (const p of profiles8w) {
  const history = simulate({ baseline, weeklyData: p.data });
  printHistory(history, `${p.name} — 2 Months`);
  results8w.push({ name: p.name, final: history[history.length - 1] });
}

// --- DETAILED BREAKDOWN for Dedicated User (2 months) ---
console.log('\n\n>>> DETAILED R/A/C BREAKDOWN — Dedicated User (8 weeks) <<<');
const dedicatedHistory = simulate({ baseline, weeklyData: generateWeeks(8, () => dedicatedWeek()) });
console.log('  Week Domain          R        A        C        Obs      Award    Final');
console.log('  ' + '-'.repeat(80));
for (const entry of dedicatedHistory) {
  for (const key of DOMAIN_KEYS) {
    printBreakdownRow(entry.week, key, entry.breakdowns[key]);
  }
  console.log('  ' + '-'.repeat(80));
}

// --- COMPARISON TABLES ---
function printComparison(results, period) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  Cross-profile comparison — ${period}`);
  console.log('='.repeat(70));
  console.log('Profile                | LS     | Even   | BLS');
  console.log('-'.repeat(55));
  for (const r of results) {
    const f = r.final;
    console.log(
      `${r.name.padEnd(23)}` +
      `| ${f.lifeStrength.toFixed(1).padStart(6)} ` +
      `| ${f.evenness.toFixed(1).padStart(6)} ` +
      `| ${f.balancedLifeScore.toFixed(1).padStart(6)}`
    );
  }
}

console.log('\n\n>>> COMPARISON TABLES <<<');
printComparison(results2w, '14 Days');
printComparison(results4w, '1 Month');
printComparison(results8w, '2 Months');

console.log('\n');
