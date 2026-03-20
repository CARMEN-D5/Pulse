/**
 * Assessment Scorer
 *
 * Converts the 25-question onboarding quiz answers into initial domain scores.
 * Each domain has 5 questions. Each answer is on a 0-10 scale.
 * Domain score = average of its 5 answers, scaled to 0-100.
 */

import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../types/scoring.types";

/** Maps each question index (0-24) to its domain */
const QUESTION_DOMAIN_MAP: DomainId[] = [
  // Questions 1-5: Spirituality / Mental Health
  "spirituality", "spirituality", "spirituality", "spirituality", "spirituality",
  // Questions 6-10: Physical Health
  "health", "health", "health", "health", "health",
  // Questions 11-15: Financial
  "financial", "financial", "financial", "financial", "financial",
  // Questions 16-20: Social Connection
  "social", "social", "social", "social", "social",
  // Questions 21-25: Productivity
  "productivity", "productivity", "productivity", "productivity", "productivity",
];

/**
 * Calculate domain scores from assessment answers.
 *
 * @param answers - Array of 25 numeric answers (each 0-10)
 * @returns DomainScores object with each domain scored 0-100
 *
 * @example
 * scoreAssessment([7, 8, 6, 5, 9, ...]) // 25 answers
 * // { spirituality: 70, health: ..., financial: ..., social: ..., productivity: ... }
 */
export function scoreAssessment(answers: number[]): DomainScores {
  if (answers.length !== 25) {
    throw new Error(`Expected 25 answers, got ${answers.length}`);
  }

  // Group answers by domain
  const domainAnswers: Record<DomainId, number[]> = {} as Record<DomainId, number[]>;
  for (const id of DOMAIN_IDS) {
    domainAnswers[id] = [];
  }

  answers.forEach((answer, index) => {
    const domain = QUESTION_DOMAIN_MAP[index];
    domainAnswers[domain].push(answer);
  });

  // Calculate average per domain, scale to 0-100
  const scores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const domainAvg =
      domainAnswers[id].reduce((sum, a) => sum + a, 0) /
      domainAnswers[id].length;
    scores[id] = Math.round(domainAvg * 10); // 0-10 avg → 0-100
  }

  return scores;
}
