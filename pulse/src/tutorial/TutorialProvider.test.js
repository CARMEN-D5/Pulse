jest.mock("../firestore/tutorials", () => ({
  saveTutorialResult: jest.fn(async () => ({ ok: true })),
  resetTutorialProgress: jest.fn(async () => ({ ok: true })),
}));

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import { saveTutorialResult } from "../firestore/tutorials";
import { TUTORIALS } from "./tutorialDefinitions";
import {
  TutorialProvider,
  TutorialTarget,
  calculateTutorialScrollOffset,
  targetRectForOverlay,
  useTutorial,
  useTutorialContext,
} from "./TutorialProvider";
import { TUTORIAL_TARGETS } from "./tutorialTargets";

const TEST_USER = { uid: "u1" };
const EMPTY_PROGRESS = {};

function FeatureHarness() {
  useTutorial("features");
  return (
    <>
      <TutorialTarget id={TUTORIAL_TARGETS.features.list}>
        <Text>Tools content</Text>
      </TutorialTarget>
      <TutorialTarget id={TUTORIAL_TARGETS.features.missions}>
        <Text>Missions tool</Text>
      </TutorialTarget>
    </>
  );
}

function AppOverviewContent({ route, onDomainPress }) {
  useTutorial("appOverview");
  if (route.view !== "home") return <Text>Spirituality screen</Text>;
  return (
    <>
      <TutorialTarget id={TUTORIAL_TARGETS.home.dailyMissions}>
        <Text>Daily missions area</Text>
      </TutorialTarget>
      <TutorialTarget id={TUTORIAL_TARGETS.home.domainCard}>
        <Pressable accessibilityLabel="Spirituality domain" onPress={onDomainPress}>
          <Text>Spirituality</Text>
        </Pressable>
      </TutorialTarget>
      <TutorialTarget id={TUTORIAL_TARGETS.navigation.features}>
        <Text>Features tab</Text>
      </TutorialTarget>
      <TutorialTarget id={TUTORIAL_TARGETS.navigation.social}>
        <Text>Social tab</Text>
      </TutorialTarget>
      <TutorialTarget id={TUTORIAL_TARGETS.navigation.profile}>
        <Text>Profile tab</Text>
      </TutorialTarget>
    </>
  );
}

function RoutedHarness({ control, domainPresses }) {
  const [route, setRoute] = useState({ view: "home", domain: null });
  const ensureRoute = useCallback(
    (required) => setRoute({ view: required.view, domain: required.domain || null }),
    []
  );
  control.current = { route, setRoute };
  return (
    <TutorialProvider
      user={TEST_USER}
      initialProgress={EMPTY_PROGRESS}
      navigation={{ currentRoute: route, ensureRoute }}
    >
      <AppOverviewContent
        route={route}
        onDomainPress={() => {
          domainPresses();
          setRoute({ view: "domain", domain: "spirituality" });
        }}
      />
    </TutorialProvider>
  );
}

function TutorialStateProbe({ onChange }) {
  const state = useTutorialContext();
  useEffect(() => {
    onChange(state);
  }, [onChange, state]);
  return null;
}

async function advance(ms) {
  let remaining = ms;
  while (remaining > 0) {
    const slice = Math.min(50, remaining);
    await act(async () => {
      jest.advanceTimersByTime(slice);
      await Promise.resolve();
    });
    remaining -= slice;
  }
}

describe("TutorialProvider", () => {
  let warning;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    warning = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warning.mockRestore();
    jest.useRealTimers();
  });

  test("automatically starts a missing tutorial and persists Skip", async () => {
    render(
      <TutorialProvider user={{ uid: "u1" }} initialProgress={{}}>
        <FeatureHarness />
      </TutorialProvider>
    );

    await advance(900);
    expect(screen.getByText("Everything in one place")).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText("Skip tutorial"));
    expect(saveTutorialResult).toHaveBeenCalledWith(
      "u1",
      "features",
      TUTORIALS.features.version,
      "skipped"
    );
  });

  test("does not automatically repeat the current saved version", async () => {
    render(
      <TutorialProvider
        user={{ uid: "u1" }}
        initialProgress={{
          features: { version: TUTORIALS.features.version, status: "completed" },
        }}
      >
        <FeatureHarness />
      </TutorialProvider>
    );

    await advance(900);
    expect(screen.queryByLabelText("Skip tutorial")).toBeNull();
  });

  test("moves through steps and records completion", async () => {
    render(
      <TutorialProvider user={{ uid: "u1" }} initialProgress={{}}>
        <FeatureHarness />
      </TutorialProvider>
    );

    await advance(900);
    fireEvent.press(screen.getByText("Next"));
    await advance(400);
    expect(screen.getByText("Daily Missions")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Explore tools"));
    expect(saveTutorialResult).toHaveBeenLastCalledWith(
      "u1",
      "features",
      TUTORIALS.features.version,
      "completed"
    );
  });

  test("blocks a highlighted Home domain instead of navigating through the spotlight", async () => {
    const control = { current: null };
    const domainPresses = jest.fn();
    render(<RoutedHarness control={control} domainPresses={domainPresses} />);

    await advance(900);
    fireEvent.press(screen.getByText("Next"));
    await advance(400);
    expect(screen.getByText("Your five life areas")).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText("Spirituality domain"));
    await advance(100);
    expect(domainPresses).not.toHaveBeenCalled();
    expect(control.current.route).toEqual({ view: "home", domain: null });
    expect(screen.getByText("Your five life areas")).toBeOnTheScreen();
  });

  test("Back restores both the previous step and its route after an external route change", async () => {
    const control = { current: null };
    render(<RoutedHarness control={control} domainPresses={jest.fn()} />);
    await advance(900);
    fireEvent.press(screen.getByText("Next"));
    await advance(400);

    act(() => control.current.setRoute({ view: "domain", domain: "spirituality" }));
    await advance(500);
    expect(control.current.route).toEqual({ view: "home", domain: null });
    fireEvent.press(screen.getByText("Back"));
    await advance(400);

    expect(control.current.route).toEqual({ view: "home", domain: null });
    expect(screen.getByText("Your daily missions")).toBeOnTheScreen();
  });

  test("Next restores the required route before displaying the following step", async () => {
    const control = { current: null };
    render(<RoutedHarness control={control} domainPresses={jest.fn()} />);
    await advance(900);
    fireEvent.press(screen.getByText("Next"));
    await advance(400);

    act(() => control.current.setRoute({ view: "domain", domain: "spirituality" }));
    await advance(500);
    fireEvent.press(screen.getByText("Next"));
    await advance(400);

    expect(control.current.route).toEqual({ view: "home", domain: null });
    expect(screen.getByText("Tools")).toBeOnTheScreen();
  });

  test("never reports a ready step while its route is mismatched", async () => {
    const control = { current: null };
    const observed = [];
    function Harness() {
      const [route, setRoute] = useState({ view: "home", domain: null });
      control.current = { route, setRoute };
      return (
        <TutorialProvider
          user={TEST_USER}
          initialProgress={EMPTY_PROGRESS}
          navigation={{
            currentRoute: route,
            ensureRoute: (required) =>
              setRoute({ view: required.view, domain: required.domain || null }),
          }}
        >
          <AppOverviewContent route={route} onDomainPress={() => {}} />
          <TutorialStateProbe
            onChange={(state) =>
              observed.push({ ready: state.ready, step: state.step, route: control.current.route })
            }
          />
        </TutorialProvider>
      );
    }
    render(<Harness />);
    await advance(900);
    act(() => control.current.setRoute({ view: "domain", domain: "spirituality" }));
    await advance(500);

    for (const value of observed.filter((entry) => entry.ready && entry.step)) {
      expect(value.route.view).toBe(value.step.route.view);
      expect(value.route.domain || null).toBe(value.step.route.domain || null);
    }
  });

  test("scrolls a registered live target into view before showing its card", async () => {
    const scrollIntoView = jest.fn(async () => {});
    function ScrollHarness() {
      useTutorial("todo");
      const { registerTarget } = useTutorialContext();
      useEffect(
        () =>
          registerTarget(TUTORIAL_TARGETS.todo.form, {
            scrollIntoView,
            measureAsync: async () => ({ x: 20, y: 100, width: 280, height: 70 }),
          }),
        [registerTarget]
      );
      return <Text>Add task target</Text>;
    }
    render(
      <TutorialProvider user={TEST_USER} initialProgress={EMPTY_PROGRESS}>
        <ScrollHarness />
      </TutorialProvider>
    );

    await advance(900);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByText("Add a task")).toBeOnTheScreen();
  });

  test("calculates the minimum scroll needed to reveal a live target", () => {
    expect(
      calculateTutorialScrollOffset(
        { x: 20, y: 500, width: 280, height: 70 },
        { x: 0, y: 0, width: 320, height: 400 },
        0
      )
    ).toBe(182);
    expect(
      calculateTutorialScrollOffset(
        { x: 20, y: 100, width: 280, height: 70 },
        { x: 0, y: 0, width: 320, height: 400 },
        40
      )
    ).toBe(40);
  });

  test("converts window target coordinates into overlay-host coordinates", () => {
    expect(
      targetRectForOverlay(
        { x: 60, y: 140, width: 120, height: 40 },
        { x: 10, y: 20, width: 320, height: 700 }
      )
    ).toEqual({ x: 44, y: 114, width: 132, height: 52 });
  });

  test("warns and uses the accessible fallback when a target is missing", async () => {
    function MissingHarness() {
      useTutorial("todo");
      return <Text>No registered target</Text>;
    }
    render(
      <TutorialProvider user={{ uid: "u1" }} initialProgress={{}}>
        <MissingHarness />
      </TutorialProvider>
    );

    await advance(1800);
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("target could not be found"),
      expect.objectContaining({ target: TUTORIAL_TARGETS.todo.form })
    );
    expect(screen.getByText("Add a task")).toBeOnTheScreen();
  });
});
