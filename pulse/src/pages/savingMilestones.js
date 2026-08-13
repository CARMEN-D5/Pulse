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
