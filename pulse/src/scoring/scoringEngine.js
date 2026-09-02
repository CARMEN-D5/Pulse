// src/scoring/scoringEngine.js
// Pure scoring calculations — no Firestore dependency.
// Based on the Balanced Life (VELORA) scoring specification.

export const DOMAINS = {
  spirituality: {
    key: 'spirituality',
    label: 'Spirituality',
    icon: '🕊️',
    onboardingPrompt: 'How would you rate your spirituality right now?',
    reflectionPrompt: 'How grounded, peaceful, or purposeful did you feel today?',
    weeklyTarget: 200,
    actions: {
      journal:      { label: 'Journal / Reflection entry',      points: 50 },
      mindfulness:  { label: 'Mindfulness or prayer session',   points: 50 },
    },
  },
  relationships: {
    key: 'relationships',
    label: 'Family & Friends',
    icon: '🤝',
    onboardingPrompt: 'How would you rate your relationships right now?',
    reflectionPrompt: 'How connected and supported did you feel today?',
    weeklyTarget: 200,
    actions: {
      connection: { label: 'Meaningful connection log',          points: 50 },
      mission:    { label: 'Social mission / relationship task', points: 50 },
    },
  },
  productivity: {
    key: 'productivity',
    label: 'Work / Productivity',
    icon: '📚',
    onboardingPrompt: 'How would you rate your work/productivity right now?',
    reflectionPrompt: 'How satisfied are you with your productivity and progress today?',
    weeklyTarget: 250,
    actions: {
      task:  { label: 'Important task completed', points: 25 },
      focus: { label: 'Focus session completed',  points: 25 },
    },
  },
  health: {
    key: 'health',
    label: 'Health',
    icon: '💪',
    onboardingPrompt: 'How would you rate your health right now?',
    reflectionPrompt: 'How would you rate your health and energy today?',
    weeklyTarget: 300,
    actions: {
      exercise: { label: 'Exercise / Activity log', points: 50 },
      sleep:    { label: 'Sleep log',                points: 50 },
    },
  },
  finance: {
    key: 'finance',
    label: 'Financial Wellbeing',
    icon: '💰',
    onboardingPrompt: 'How would you rate your financial wellbeing right now?',
    reflectionPrompt: 'How in control of your finances did you feel today?',
    weeklyTarget: 200,
    actions: {
      expense: { label: 'Expense log',                       points: 25 },
      budget:  { label: 'Budget review or savings action',   points: 50 },
    },
  },
};

export const DOMAIN_KEYS = ['spirituality', 'relationships', 'productivity', 'health', 'finance'];

// Convert a 1-5 onboarding rating to a 20-100 score
export function ratingToScore(rating) {
  return rating * 20;
}

// R_d: average of recent 1-5 reflection values, converted to 20-100
export function calcReflectionScore(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return avg * 20;
}

// A_d = (PointsEarned / WeeklyTarget) × 100, capped at 100
export function calcActionScore(pointsEarned, weeklyTarget) {
  return Math.min(100, (pointsEarned / weeklyTarget) * 100);
}

// C_d = (DaysWithMeaningfulActivity / 7) × 100
export function calcConsistencyScore(daysActive) {
  return (Math.min(7, daysActive) / 7) * 100;
}

// DomainScore = 0.3R + 0.4A + 0.3C
export function calcDomainScore(R, A, C) {
  return 0.3 * R + 0.4 * A + 0.3 * C;
}

function stdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// LifeStrength = average of all 5 domain scores
export function calcLifeStrength(domainScores) {
  const vals = DOMAIN_KEYS.map(k => domainScores[k] ?? 0);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// Evenness = 100 - 2 × SD(D1..D5), clamped to 0-100
export function calcEvenness(domainScores) {
  const vals = DOMAIN_KEYS.map(k => domainScores[k] ?? 0);
  return Math.max(0, Math.min(100, 100 - 2 * stdDev(vals)));
}

// BalancedLifeScore = 0.5 × LifeStrength + 0.5 × Evenness
export function calcBalancedLifeScore(lifeStrength, evenness) {
  return 0.5 * lifeStrength + 0.5 * evenness;
}

// Convert a 0-100 observed domain score to an award point in the range -2 to +2.
// e.g. observed=90 → (90/100)×4 - 2 = 1.6
//      observed=50 → (50/100)×4 - 2 = 0
//      observed=0  → (0/100)×4  - 2 = -2
export function calcAwardPoint(observedScore) {
  return (observedScore / 100) * 4 - 2;
}

// Compute the new domain score plus the R/A/C breakdown that produced it.
// Returns { reflectionScore, actionScore, consistencyScore, observed, awardPoints, finalScore }.
// If there is no activity this week, finalScore = previousScore and inputs are 0/previousScore.
export function computeDomainBreakdown({ previousScore, previousReflectionScore, reflections, actionPoints, activeDays, weeklyTarget }) {
  const hasActions = actionPoints > 0;
  const hasReflections = reflections.length > 0;
  const rFallback = previousReflectionScore ?? previousScore;

  if (!hasActions && !hasReflections) {
    return {
      reflectionScore: rFallback,
      actionScore: 0,
      consistencyScore: 0,
      observed: previousScore,
      awardPoints: 0,
      finalScore: previousScore,
    };
  }

  const R = hasReflections ? calcReflectionScore(reflections) : rFallback;

  if (!hasActions) {
    return {
      reflectionScore: R,
      actionScore: 0,
      consistencyScore: 0,
      observed: previousScore,
      awardPoints: 0,
      finalScore: previousScore,
    };
  }

  const A = calcActionScore(actionPoints, weeklyTarget);
  const C = calcConsistencyScore(activeDays);
  const observed = calcDomainScore(R, A, C);
  const award = calcAwardPoint(observed);
  const finalScore = Math.max(0, Math.min(100, previousScore + award));

  return {
    reflectionScore: R,
    actionScore: A,
    consistencyScore: C,
    observed,
    awardPoints: award,
    finalScore,
  };
}

// Compute the new domain score: previousScore + award point, clamped to 0-100.
// Thin wrapper over computeDomainBreakdown that returns just the final number.
export function computeDomainScore(args) {
  return computeDomainBreakdown(args).finalScore;
}

// Compute global metrics from five domain scores
export function computeGlobalScores(domainScores) {
  const lifeStrength = calcLifeStrength(domainScores);
  const evenness = calcEvenness(domainScores);
  const balancedLifeScore = calcBalancedLifeScore(lifeStrength, evenness);
  return { lifeStrength, evenness, balancedLifeScore };
}
