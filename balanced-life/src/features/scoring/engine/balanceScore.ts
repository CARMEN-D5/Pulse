/**
 * Balance Score Calculator
 *
 * Final formula: Balance Score = Wellness Level × Balance Factor
 *
 * Where:
 * - Wellness Level = average of 5 domain scores
 * - Balance Factor = 1 - (SD / 100) * 0.5
 *
 * See Scoring_System.docx Section 6 for worked examples.
 */

import { DomainScores, BalanceScoreResult } from "../types/scoring.types";
import { DOMAIN_IDS } from "../../../config/domains";
import { calculateBalanceFactor, standardDeviation } from "./balanceFactor";

/**
 * Calculate the complete Balance Score from 5 domain scores.
 *
 * @param domainScores - Object with scores for all 5 domains (each 0-100)
 * @returns Full result including wellness, SD, balance factor, and final score
 *
 * @example
 * calculateBalanceScore({
 *   spirituality: 70, health: 55, financial: 72, social: 48, productivity: 61
 * })
 * // { wellnessLevel: 61.2, balanceFactor: 0.955, balanceScore: 58, ... }
 */
export function calculateBalanceScore(
  domainScores: DomainScores
): BalanceScoreResult {
  const scores = DOMAIN_IDS.map((id) => domainScores[id]);

  // Step 1: Wellness Level (simple average)
  const wellnessLevel =
    scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Step 2: Standard Deviation
  const sd = standardDeviation(scores);

  // Step 3: Balance Factor
  const balanceFactor = calculateBalanceFactor(scores);

  // Step 4: Final Balance Score
  const balanceScore = Math.round(wellnessLevel * balanceFactor);

  return {
    domainScores,
    wellnessLevel: Math.round(wellnessLevel * 10) / 10,
    standardDeviation: Math.round(sd * 10) / 10,
    balanceFactor: Math.round(balanceFactor * 1000) / 1000,
    balanceScore: Math.max(0, Math.min(100, balanceScore)),
  };
}
