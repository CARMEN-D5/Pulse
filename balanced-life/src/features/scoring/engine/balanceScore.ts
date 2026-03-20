/**
 * Balance Score Calculator — Geometric Mean
 *
 * Uses geometric mean of the 5 domain scores instead of arithmetic mean.
 * This naturally penalises neglected domains:
 *   - [80, 80, 80, 80, 20] arithmetic = 68, geometric ≈ 60.6
 *   - [60, 60, 60, 60, 60] arithmetic = 60, geometric = 60
 *
 * A floor of 1 is applied before multiplication to prevent zero-collapse
 * (one domain at 0 would otherwise make the entire Balance Score 0).
 */

import { DomainScores, BalanceScoreResult } from "../types/scoring.types";
import { DOMAIN_IDS } from "../../../config/domains";
import { GEO_MEAN_FLOOR } from "../../../config/scoring";
import { standardDeviation } from "./balanceFactor";

/**
 * Calculate the Balance Score using geometric mean of 5 domain scores.
 *
 * @param domainScores - Object with scores for all 5 domains (each 0-100)
 * @returns Full result including geometric mean balance score and imbalance SD
 *
 * @example
 * calculateBalanceScore({
 *   spirituality: 70, health: 55, financial: 72, social: 48, productivity: 61
 * })
 * // { balanceScore: 60, imbalanceSD: 9.2, ... }
 */
export function calculateBalanceScore(
  domainScores: DomainScores
): BalanceScoreResult {
  const scores = DOMAIN_IDS.map((id) => domainScores[id]);

  // Apply floor to prevent zero-collapse
  const floored = scores.map((s) => Math.max(s, GEO_MEAN_FLOOR));

  // Geometric mean: (D1 × D2 × D3 × D4 × D5)^(1/5)
  const product = floored.reduce((acc, s) => acc * s, 1);
  const geoMean = Math.pow(product, 1 / scores.length);

  // Imbalance indicator (for weekly insights, not used in score)
  const sd = standardDeviation(scores);

  const balanceScore = Math.round(Math.max(0, Math.min(100, geoMean)));

  return {
    domainScores,
    balanceScore,
    imbalanceSD: Math.round(sd * 10) / 10,
  };
}
