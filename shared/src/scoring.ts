import { DOMAIN_KEYS, type DomainKey } from "./domains";

export const RATING_TO_SCORE: Record<number, number> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100
};

export const DOMAIN_WEEKLY_ACTION_TARGETS: Record<DomainKey, number> = {
  spirituality: 200,
  family_friends: 200,
  work_productivity: 250,
  health: 300,
  financial_wellbeing: 200
};

export type OnboardingBlendWeights = {
  bootstrapWeight: number;
  observedWeight: number;
};

export type WeeklyDomainSummaryInput = {
  domainKey: DomainKey;
  activeDaysInWindow: number;
  reflectionScores: number[];
  actionPointsEarned: number;
  accountAgeDays: number;
  initialRatingScore?: number | null;
  previousDisplayedScore?: number | null;
};

export type WeeklyDomainSummaryOutput = {
  reflectionDaysCount: number;
  reflectionScore: number | null;
  actionTargetPoints: number;
  actionScore: number;
  consistencyDaysCount: number;
  consistencyScore: number;
  currentComputedScore: number;
  blendedComputedScore: number;
  displayedScore: number;
  bootstrapWeightUsed: number;
  observedWeightUsed: number;
  usedReflectionReweighting: boolean;
};

export type WeeklyLifeSummaryInput = {
  domainScores: Array<{
    domainKey: DomainKey;
    displayedScore: number;
    isProvisional?: boolean;
  }>;
};

export type WeeklyLifeSummaryOutput = {
  lifeStrength: number;
  evenness: number;
  balancedLifeScore: number;
  strongestDomainKey: DomainKey;
  weakestDomainKey: DomainKey;
  isProvisional: boolean;
};

export function mapRatingValueToScore(ratingValue: number) {
  const mappedScore = RATING_TO_SCORE[ratingValue];

  if (!mappedScore) {
    throw new Error(`Unsupported rating value: ${ratingValue}`);
  }

  return mappedScore;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDisplayedScore(previousDisplayedScore: number, currentComputedScore: number) {
  return roundScore(clampScore(previousDisplayedScore * 0.7 + currentComputedScore * 0.3));
}

export function getDomainWeeklyActionTarget(domainKey: DomainKey) {
  return DOMAIN_WEEKLY_ACTION_TARGETS[domainKey];
}

export function getOnboardingBlendWeights(accountAgeDays: number): OnboardingBlendWeights {
  if (accountAgeDays >= 1 && accountAgeDays <= 3) {
    return { bootstrapWeight: 0.7, observedWeight: 0.3 };
  }

  if (accountAgeDays >= 4 && accountAgeDays <= 7) {
    return { bootstrapWeight: 0.4, observedWeight: 0.6 };
  }

  if (accountAgeDays >= 8 && accountAgeDays <= 14) {
    return { bootstrapWeight: 0.2, observedWeight: 0.8 };
  }

  return { bootstrapWeight: 0, observedWeight: 1 };
}

export function calculateActionTargetPoints(domainKey: DomainKey, activeDaysInWindow: number) {
  if (activeDaysInWindow < 1 || activeDaysInWindow > 7) {
    throw new Error(`activeDaysInWindow must be between 1 and 7, got ${activeDaysInWindow}`);
  }

  return roundScore((getDomainWeeklyActionTarget(domainKey) * activeDaysInWindow) / 7);
}

export function calculateActionScore(pointsEarned: number, actionTargetPoints: number) {
  if (actionTargetPoints <= 0) {
    throw new Error(`actionTargetPoints must be > 0, got ${actionTargetPoints}`);
  }

  return roundScore(clampScore((pointsEarned / actionTargetPoints) * 100));
}

export function calculateConsistencyScore(consistencyDaysCount: number, activeDaysInWindow: number) {
  if (activeDaysInWindow < 1 || activeDaysInWindow > 7) {
    throw new Error(`activeDaysInWindow must be between 1 and 7, got ${activeDaysInWindow}`);
  }

  return roundScore(clampScore((consistencyDaysCount / activeDaysInWindow) * 100));
}

export function calculateCurrentComputedScore(input: {
  reflectionScore: number | null;
  actionScore: number;
  consistencyScore: number;
}) {
  const { reflectionScore, actionScore, consistencyScore } = input;

  if (reflectionScore == null) {
    return {
      currentComputedScore: roundScore(
        clampScore(((0.4 * actionScore) + (0.3 * consistencyScore)) / 0.7)
      ),
      usedReflectionReweighting: true
    };
  }

  return {
    currentComputedScore: roundScore(
      clampScore((0.3 * reflectionScore) + (0.4 * actionScore) + (0.3 * consistencyScore))
    ),
    usedReflectionReweighting: false
  };
}

export function calculateBlendedComputedScore(input: {
  currentComputedScore: number;
  accountAgeDays: number;
  initialRatingScore?: number | null;
}) {
  const { currentComputedScore, accountAgeDays, initialRatingScore } = input;
  const weights = getOnboardingBlendWeights(accountAgeDays);

  if (weights.bootstrapWeight > 0) {
    if (initialRatingScore == null) {
      throw new Error("initialRatingScore is required while onboarding blend is active");
    }

    return {
      blendedComputedScore: roundScore(
        clampScore(
          (weights.bootstrapWeight * initialRatingScore) +
            (weights.observedWeight * currentComputedScore)
        )
      ),
      ...weights
    };
  }

  return {
    blendedComputedScore: roundScore(currentComputedScore),
    ...weights
  };
}

export function calculateWeeklyDomainSummary(input: WeeklyDomainSummaryInput): WeeklyDomainSummaryOutput {
  const reflectionDaysCount = input.reflectionScores.length;
  const reflectionScore =
    reflectionDaysCount > 0
      ? roundScore(
          input.reflectionScores.reduce((sum, value) => sum + value, 0) / reflectionDaysCount
        )
      : null;
  const actionTargetPoints = calculateActionTargetPoints(input.domainKey, input.activeDaysInWindow);
  const actionScore = calculateActionScore(input.actionPointsEarned, actionTargetPoints);
  const consistencyDaysCount = reflectionDaysCount;
  const consistencyScore = calculateConsistencyScore(
    consistencyDaysCount,
    input.activeDaysInWindow
  );
  const computed = calculateCurrentComputedScore({
    reflectionScore,
    actionScore,
    consistencyScore
  });
  const blended = calculateBlendedComputedScore({
    currentComputedScore: computed.currentComputedScore,
    accountAgeDays: input.accountAgeDays,
    initialRatingScore: input.initialRatingScore
  });
  const displayedScore =
    input.previousDisplayedScore == null
      ? blended.blendedComputedScore
      : calculateDisplayedScore(input.previousDisplayedScore, blended.blendedComputedScore);

  return {
    reflectionDaysCount,
    reflectionScore,
    actionTargetPoints,
    actionScore,
    consistencyDaysCount,
    consistencyScore,
    currentComputedScore: computed.currentComputedScore,
    blendedComputedScore: blended.blendedComputedScore,
    displayedScore,
    bootstrapWeightUsed: blended.bootstrapWeight,
    observedWeightUsed: blended.observedWeight,
    usedReflectionReweighting: computed.usedReflectionReweighting
  };
}

export function calculateEvennessScore(displayedScores: number[]) {
  if (displayedScores.length === 0) {
    throw new Error("displayedScores must not be empty");
  }

  const mean = displayedScores.reduce((sum, value) => sum + value, 0) / displayedScores.length;
  const variance =
    displayedScores.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    displayedScores.length;
  const standardDeviation = Math.sqrt(variance);

  return roundScore(clampScore(100 - 2 * standardDeviation));
}

export function calculateWeeklyLifeSummary(input: WeeklyLifeSummaryInput): WeeklyLifeSummaryOutput {
  if (input.domainScores.length !== DOMAIN_KEYS.length) {
    throw new Error(`Expected ${DOMAIN_KEYS.length} domain scores, got ${input.domainScores.length}`);
  }

  const orderedScores = DOMAIN_KEYS.map((domainKey) => {
    const match = input.domainScores.find((entry) => entry.domainKey === domainKey);

    if (!match) {
      throw new Error(`Missing domain score for ${domainKey}`);
    }

    return match;
  });

  const displayedScores = orderedScores.map((entry) => entry.displayedScore);
  const lifeStrength = roundScore(
    displayedScores.reduce((sum, value) => sum + value, 0) / displayedScores.length
  );
  const evenness = calculateEvennessScore(displayedScores);
  const balancedLifeScore = roundScore((0.5 * lifeStrength) + (0.5 * evenness));
  const strongestDomainKey = [...orderedScores].sort(
    (left, right) => right.displayedScore - left.displayedScore
  )[0].domainKey;
  const weakestDomainKey = [...orderedScores].sort(
    (left, right) => left.displayedScore - right.displayedScore
  )[0].domainKey;

  return {
    lifeStrength,
    evenness,
    balancedLifeScore,
    strongestDomainKey,
    weakestDomainKey,
    isProvisional: orderedScores.some((entry) => entry.isProvisional === true)
  };
}
