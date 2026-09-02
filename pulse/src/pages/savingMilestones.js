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

/* ---------------- sharing ---------------- */

/**
 * Turns a progress event into a share payload for the `finance` domain.
 *
 * Savings rides on `finance` rather than getting a domain of its own, because
 * that is what the design already assumed — see the finance line in
 * SharePromptProvider's useAutoSharePrompt docstring, which describes exactly
 * this achievement (`goal.currentAmount >= goal.targetAmount`, keyed by goal
 * id). Two more `kind`s sit alongside "month-under" and "category-under".
 *
 * The event carries the name and the numbers but not the plan's icon or
 * colour, so the plan doc is passed in to fill those.
 */
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
 * Share payload for a plan's CURRENT state, rather than for a crossing event.
 *
 * getSavingProgressEvent only fires on 25/50/75/90/100, which is right for an
 * automatic prompt — those are the moments worth interrupting someone for.
 * But a manual share button should work whenever the user feels like it, at
 * 12% or 43% or anything else.
 *
 * No new template is needed: finance-savings-milestone gates on
 * `actualProgress`, not on `milestone`, precisely so an arbitrary percentage
 * renders. `milestone` is left 0 here because none was crossed — nothing
 * reads it, and writing a fake one would make the stored post claim an
 * achievement that did not happen.
 *
 * Returns null when there is nothing worth showing, which is what makes
 * ShareButton hide itself on a plan with no savings yet.
 */
export function savingPlanSharePayload(plan, savedAmount) {
  const targetAmount = Number(plan?.targetAmount || 0);
  const saved = Number(savedAmount || 0);
  if (!plan || targetAmount <= 0 || saved <= 0) return null;

  // Completion is decided by the amounts, never by the rounded percentage.
  // $1,990 of $2,000 rounds to 100% and would otherwise offer a card reading
  // "I reached my saving goal" while $10 short. For the same reason an
  // incomplete plan is capped at 99% rather than displaying a rounded 100.
  const complete = saved >= targetAmount;
  const progress = complete
      ? 100
      : Math.min(Math.round((saved / targetAmount) * 100), 99);

  // $1 against a $2,000 goal rounds to 0%, and the milestone template requires
  // actualProgress > 0. Returning null here keeps this helper and the template
  // in agreement, so canSharePlan() never promises a card the carousel would
  // then refuse to show.
  if (!complete && progress < 1) return null;

  return {
    kind: complete ? "savings-goal" : "savings-milestone",
    planName: plan.name ?? "",
    planIcon: plan.icon ?? "🎯",
    planColor: plan.color ?? "",
    savedAmount: saved,
    targetAmount,
    actualProgress: progress,
    milestone: 0,
  };
}

/** True when a plan has enough progress for the manual share button to show. */
export function canSharePlan(plan, savedAmount) {
  return savingPlanSharePayload(plan, savedAmount) !== null;
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