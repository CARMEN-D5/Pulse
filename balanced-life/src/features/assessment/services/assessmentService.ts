/**
 * Assessment Service
 *
 * Converts the 25-question onboarding quiz into initial domain scores.
 * Each answer (1-5) maps to 0-100: item_score = ((response - 1) / 4) * 100
 * Domain baseline = average of its 5 item scores.
 * Balance Score = geometric mean of the 5 domain baselines.
 */

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { ASSESSMENT_QUESTIONS } from "../constants/questions";
import { DomainScores, BalanceScoreResult } from "../../scoring/types/scoring.types";
import { calculateBalanceScore } from "../../scoring/engine/balanceScore";

/** Convert a raw answer (1-5) to a 0-100 score */
function answerToScore(value: number): number {
  return ((value - 1) / 4) * 100;
}

/** Calculate domain scores from raw answers */
export function calculateAssessmentScores(answers: Record<number, number>): BalanceScoreResult {
  // Group scores by domain
  const domainTotals: Record<DomainId, number[]> = {} as Record<DomainId, number[]>;
  for (const id of DOMAIN_IDS) {
    domainTotals[id] = [];
  }

  ASSESSMENT_QUESTIONS.forEach((q) => {
    const rawValue = answers[q.id];
    if (rawValue != null) {
      domainTotals[q.domain].push(answerToScore(rawValue));
    }
  });

  // Domain baseline = average of its 5 item scores
  const domainScores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const scores = domainTotals[id];
    const avg = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;
    domainScores[id] = Math.round(avg);
  }

  return calculateBalanceScore(domainScores);
}

/** Save assessment results to Firestore */
export async function saveAssessmentResults(
  userId: string,
  answers: Record<number, number>,
  result: BalanceScoreResult
): Promise<void> {
  // Save assessment answers
  await setDoc(doc(db, "users", userId, "assessments", "initial"), {
    answers,
    domainScores: result.domainScores,
    balanceScore: result.balanceScore,
    imbalanceSD: result.imbalanceSD,
    completedAt: Timestamp.now(),
  });

  // Update user profile with initial scores
  await setDoc(
    doc(db, "users", userId),
    {
      hasCompletedAssessment: true,
      latestDomainScores: result.domainScores,
      latestBalanceScore: result.balanceScore,
      assessmentCompletedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
