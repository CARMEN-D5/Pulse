export const RATING_TO_SCORE: Record<number, number> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100
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

export function calculateDisplayedScore(previousDisplayedScore: number, currentComputedScore: number) {
  return clampScore(previousDisplayedScore * 0.7 + currentComputedScore * 0.3);
}
