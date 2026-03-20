import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { DomainId, DOMAIN_IDS } from "../../../config/domains";
import { ASSESSMENT_QUESTIONS, ANSWER_OPTIONS } from "../constants/questions";
import { DomainScores, BalanceScoreResult } from "../../scoring/types/scoring.types";
import { calculateBalanceScore } from "../../scoring/engine/balanceScore";

/** Convert raw answers (1-5 values) to 0-10 scores, handling reverse scoring */
function answersToScores(answers: Record<number, number>): number[] {
  return ASSESSMENT_QUESTIONS.map((q) => {
    const rawValue = answers[q.id];
    const option = ANSWER_OPTIONS.find((o) => o.value === rawValue);
    if (!option) return 0;
    return q.reverseScored ? 10 - option.score : option.score;
  });
}

/** Calculate domain scores from raw answers */
export function calculateAssessmentScores(answers: Record<number, number>): BalanceScoreResult {
  const scores = answersToScores(answers);

  // Group by domain and average
  const domainTotals: Record<DomainId, number[]> = {} as Record<DomainId, number[]>;
  for (const id of DOMAIN_IDS) {
    domainTotals[id] = [];
  }

  scores.forEach((score, index) => {
    const domain = ASSESSMENT_QUESTIONS[index].domain;
    domainTotals[domain].push(score);
  });

  const domainScores = {} as DomainScores;
  for (const id of DOMAIN_IDS) {
    const avg = domainTotals[id].reduce((sum, s) => sum + s, 0) / domainTotals[id].length;
    domainScores[id] = Math.round(avg * 10); // 0-10 avg → 0-100
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
    wellnessLevel: result.wellnessLevel,
    balanceFactor: result.balanceFactor,
    standardDeviation: result.standardDeviation,
    completedAt: Timestamp.now(),
  });

  // Update user profile
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
