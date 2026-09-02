import { TUTORIALS, TUTORIAL_ORDER, tutorialNeedsShowing } from "./tutorialDefinitions";

describe("tutorial catalogue", () => {
  test("contains every ordered tutorial with steps and a positive version", () => {
    expect(TUTORIAL_ORDER.length).toBeGreaterThan(8);
    for (const id of TUTORIAL_ORDER) {
      expect(TUTORIALS[id]).toBeDefined();
      expect(TUTORIALS[id].version).toBeGreaterThan(0);
      expect(TUTORIALS[id].steps.length).toBeGreaterThan(0);
    }
  });

  test("shows missing and outdated tutorials", () => {
    expect(tutorialNeedsShowing({}, "features")).toBe(true);
    expect(
      tutorialNeedsShowing({ features: { version: TUTORIALS.features.version - 1 } }, "features")
    ).toBe(true);
  });

  test("does not show a tutorial whose current version was completed or skipped", () => {
    const version = TUTORIALS.features.version;
    expect(tutorialNeedsShowing({ features: { version, status: "completed" } }, "features")).toBe(false);
    expect(tutorialNeedsShowing({ features: { version, status: "skipped" } }, "features")).toBe(false);
  });

  test("every step declares a route and a stable semantic target", () => {
    for (const tutorial of Object.values(TUTORIALS)) {
      for (const step of tutorial.steps) {
        expect(step.route?.view).toBeTruthy();
        expect(step.target).toMatch(/^[a-z]+\.[a-zA-Z0-9.]+$/);
      }
    }
  });

  test("keeps saving records guidance inside Saving Plans", () => {
    expect(TUTORIALS.savingRecords).toBeUndefined();
    expect(TUTORIAL_ORDER).not.toContain("savingRecords");
    expect(TUTORIALS.savingOverview.steps).toHaveLength(3);
    expect(TUTORIALS.savingOverview.steps[2].target).toContain("saving.calendar");
    expect(TUTORIALS.savingOverview.steps[2].body).toBe(
      "Tap a date to view its saving records. Long-press today or any of the previous 7 days to add or edit a record. Future dates can't be edited."
    );
  });

  test("describes Home scores without calling domain rows trackers", () => {
    const homeScoresStep = TUTORIALS.appOverview.steps[1];
    expect(homeScoresStep.body).toBe(
      "See your scores across five life areas. Switch between Diagram and Details to view your balance in different ways."
    );
    expect(homeScoresStep.body).not.toMatch(/tap a row|tracker/i);
  });
});
