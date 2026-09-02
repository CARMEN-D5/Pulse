export const SAVING_MILESTONES = [25, 50, 75, 90];

export function getSavingProgressEvent(plan, oldSavedAmount, newSavedAmount) {
  const targetAmount = Number(plan?.targetAmount || 0);
  if (!plan || targetAmount <= 0 || newSavedAmount <= oldSavedAmount) return null;

  const oldProgress = (Number(oldSavedAmount || 0) / targetAmount) * 100;
  const newProgress = (Number(newSavedAmount || 0) / targetAmount) * 100;

  if (oldProgress < 100 && newProgress >= 100) {
    return {
      type: "completed",
      planId: plan.id,
      planName: plan.name,
      savedAmount: Number(newSavedAmount || 0),
      targetAmount,
      actualProgress: 100,
    };
  }

  const crossed = SAVING_MILESTONES.filter(
      (milestone) => oldProgress < milestone && newProgress >= milestone
  );
  if (!crossed.length) return null;

  return {
    type: "milestone",
    planId: plan.id,
    planName: plan.name,
    milestone: Math.max(...crossed),
    savedAmount: Number(newSavedAmount || 0),
    targetAmount,
    actualProgress: Math.min(Math.round(newProgress), 100),
  };
}

// sharing
export function savingsSharePayload(event, plan) {
  if (!event) return null;
  return {
    kind: event.type === "completed" ? "savings-goal" : "savings-milestone",
    planName: event.planName ?? plan?.name ?? "",
    planIcon: plan?.icon ?? "🎯",
    planColor: plan?.color ?? "",
    savedAmount: Number(event.savedAmount || 0),
    targetAmount: Number(event.targetAmount || 0),
    actualProgress: Number(event.actualProgress || 0),
    milestone: Number(event.milestone || 0),
  };
}

/**
 * Picks the one event worth prompting about when several fire from a single
 * save — paying four plans at once, or one payment crossing 25% and 50%
 * together. Prompting for each in turn is the fastest way to teach someone to
 * dismiss the prompt without reading it.
 *
 * Completing a goal always wins; otherwise the highest milestone does.
 */
export function bestShareEvent(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.type === "completed") return a;
  if (b.type === "completed") return b;
  return Number(b.milestone || 0) > Number(a.milestone || 0) ? b : a;
}