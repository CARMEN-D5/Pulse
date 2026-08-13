import { getSavingProgressEvent } from "./savingMilestones";

const plan = { id: "trip", name: "Japan Trip", targetAmount: 100 };

test("returns only the highest milestone crossed", () => {
  expect(getSavingProgressEvent(plan, 10, 55)).toMatchObject({ type: "milestone", milestone: 50, actualProgress: 55 });
});

test("completion overrides every crossed milestone", () => {
  expect(getSavingProgressEvent(plan, 80, 105)).toMatchObject({ type: "completed", savedAmount: 105, targetAmount: 100 });
});

test("does not trigger when progress falls or does not cross a threshold", () => {
  expect(getSavingProgressEvent(plan, 80, 70)).toBeNull();
  expect(getSavingProgressEvent(plan, 53, 58)).toBeNull();
});

test("a milestone can trigger again after progress previously fell below it", () => {
  expect(getSavingProgressEvent(plan, 70, 78)).toMatchObject({ type: "milestone", milestone: 75 });
});

test("completion keeps the real over-goal saved amount", () => {
  expect(getSavingProgressEvent({ ...plan, targetAmount: 5000 }, 4900, 5280)).toMatchObject({ type: "completed", savedAmount: 5280, targetAmount: 5000 });
});
