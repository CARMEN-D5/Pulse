/**
 * Assessment Scorer
 *
 * Converts the 25-question onboarding quiz answers into initial domain scores.
 * Each answer (1-5) maps to 0-100: item_score = ((response - 1) / 4) * 100
 * Domain score = average of its 5 items.
 *
 * Question order:
 *   1-5:   Spirituality
 *   6-10:  Family & Friends (social)
 *   11-15: Work / Productivity
 *   16-20: Health
 *   21-25: Financial
 */

import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { DomainScores } from "../types/scoring.types";

/** Maps each question index (0-24) to its domain */
const QUESTION_DOMAIN_MAP: DomainId[] = [
  // Questions 1-5: Spirituality
  "spirituality", "spirituality", "spirituality", "spirituality", "spirituality",
  // Questions 6-10: Family & Friends
  "social", "social", "social", "social", "social",
  // Questions 11-15: Work / Productivity
  "productivity", "productivity", "productivity", "productivity", "productivity",
  // Questions 16-20: Health
  "health", "health", "health", "health", "health",
  // Questions 21-25: Financial
  "financial", "financial", "financial", "financial", "financial",
];

/**
 * Calculate domain scores from assessment answers.
 *
 * @param answers - Array of 25 numeric answers (each 1-5)
 * @returns DomainScores object with each domain scored 0-100
 *
 * @example
 * scoreAssessment([4, 3, 5, 3, 4, ...]) // 25 answers
 * // { spirituality: 69, health: ..., financial: ..., social: ..., productivity: ... }
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
    // Convert 1-5 to 0-100: ((answer - 1) / 4) * 100
    const score = ((answer - 1) / 4) * 100;
    domainAnswers[domain].push(score);
  });

  // Calculate average per domain
  const scores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const items = domainAnswers[id];
    const avg = items.reduce((sum, a) => sum + a, 0) / items.length;
    scores[id] = Math.round(avg);
  }

  return scores;
}
