import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { saveTutorialResult, resetTutorialProgress } from "../firestore/tutorials";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { TUTORIALS, routeMatches, tutorialNeedsShowing } from "./tutorialDefinitions";

const TutorialContext = createContext(null);
const TutorialScrollContext = createContext([]);

const FALLBACK_CONTEXT = {
  active: null,
  tutorial: null,
  step: null,
  stepIndex: 0,
  targetRect: null,
  measuring: false,
  ready: false,
  progress: {},
  registerTarget: () => () => {},
  registerController: () => () => {},
  notifyTargetLayout: () => {},
  invalidateLayout: () => {},
  startTutorial: () => false,
  isHandled: () => true,
  next: () => {},
  back: () => {},
  skip: () => {},
  resetAll: async () => ({ ok: true }),
};

const TARGET_PAD = 6;
const VIEWPORT_MARGIN = 12;
const ROUTE_TIMEOUT = 1400;
const TARGET_TIMEOUT = 1200;
const LAYOUT_TOLERANCE = 1;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextLayoutFrame = () => delay(16);

function warnTutorial(message, details = {}) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[Pulse tutorial] ${message}`, details);
  }
}

function controllerAction(controllerSet, actionName) {
  if (!controllerSet) return null;
  for (const controller of Array.from(controllerSet).reverse()) {
    const action = controller?.actions?.[actionName];
    if (action) return action;
  }
  return null;
}

function rectIsValid(rect) {
  return Boolean(
    rect &&
      [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
      rect.width > 0 &&
      rect.height > 0
  );
}

function rectsMatch(a, b) {
  return (
    rectIsValid(a) &&
    rectIsValid(b) &&
    Math.abs(a.x - b.x) <= LAYOUT_TOLERANCE &&
    Math.abs(a.y - b.y) <= LAYOUT_TOLERANCE &&
    Math.abs(a.width - b.width) <= LAYOUT_TOLERANCE &&
    Math.abs(a.height - b.height) <= LAYOUT_TOLERANCE
  );
}

function rectInsideViewport(rect, viewport) {
  if (!rectIsValid(rect) || !rectIsValid(viewport)) return false;
  return (
    rect.x >= viewport.x - LAYOUT_TOLERANCE &&
    rect.y >= viewport.y - LAYOUT_TOLERANCE &&
    rect.x + rect.width <= viewport.x + viewport.width + LAYOUT_TOLERANCE &&
    rect.y + rect.height <= viewport.y + viewport.height + LAYOUT_TOLERANCE
  );
}

function rectVisibleInViewport(rect, viewport, minimum = 8) {
  if (!rectIsValid(rect) || !rectIsValid(viewport)) return false;
  const right = Math.min(rect.x + rect.width, viewport.x + viewport.width);
  const bottom = Math.min(rect.y + rect.height, viewport.y + viewport.height);
  return right - Math.max(rect.x, viewport.x) >= minimum &&
    bottom - Math.max(rect.y, viewport.y) >= minimum;
}

export function calculateTutorialScrollOffset(target, viewport, currentY, margin = VIEWPORT_MARGIN) {
  if (!rectIsValid(target) || !rectIsValid(viewport)) return currentY;
  const usableTop = viewport.y + margin;
  const usableBottom = viewport.y + viewport.height - margin;
  let deltaY = 0;
  if (target.height > usableBottom - usableTop || target.y < usableTop) {
    deltaY = target.y - usableTop;
  } else if (target.y + target.height > usableBottom) {
    deltaY = target.y + target.height - usableBottom;
  }
  return Math.max(0, currentY + deltaY);
}

export function targetRectForOverlay(target, host, padding = TARGET_PAD) {
  if (!rectIsValid(target) || !rectIsValid(host)) return null;
  const localX = target.x - host.x;
  const localY = target.y - host.y;
  const x = Math.max(0, localX - padding);
  const y = Math.max(0, localY - padding);
  const width = Math.min(host.width - x, target.width + padding * 2);
  const height = Math.min(host.height - y, target.height + padding * 2);
  return width > 0 && height > 0 ? { x, y, width, height } : null;
}

async function waitForValue(read, timeout = TARGET_TIMEOUT) {
  const deadline = Date.now() + timeout;
  let value = read();
  while (!value && Date.now() < deadline) {
    await delay(24);
    value = read();
  }
  return value || null;
}

async function waitForStableMeasurement(target, generationIsCurrent) {
  let previous = null;
  let stableCount = 0;
  let invalidCount = 0;
  for (let attempt = 0; attempt < 12 && generationIsCurrent(); attempt += 1) {
    const rect = await target.measureAsync();
    if (!rectIsValid(rect)) {
      previous = null;
      stableCount = 0;
      invalidCount += 1;
      if (invalidCount >= 2) return null;
    } else if (rectsMatch(previous, rect)) {
      invalidCount = 0;
      stableCount += 1;
      if (stableCount >= 2) return rect;
    } else {
      invalidCount = 0;
      previous = rect;
      stableCount = 0;
    }
    await nextLayoutFrame();
  }
  return null;
}

export function TutorialProvider({ user, initialProgress, navigation, children }) {
  const [progress, setProgress] = useState(initialProgress || {});
  const [active, setActive] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const [ready, setReady] = useState(false);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const targets = useRef(new Map());
  const controllers = useRef(new Map());
  const activeRef = useRef(null);
  const stepRef = useRef(null);
  const navigationRef = useRef(navigation);
  const prepareGeneration = useRef(0);

  navigationRef.current = navigation;

  useEffect(() => {
    setProgress(initialProgress || {});
    setActive(null);
    setStepIndex(0);
    setTargetRect(null);
    setReady(false);
  }, [user?.uid, initialProgress]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener?.("change", () => {
      setReady(false);
      setLayoutEpoch((value) => value + 1);
    });
    return () => subscription?.remove?.();
  }, []);

  const registerTarget = useCallback((id, target) => {
    if (!id) return () => {};
    const existing = targets.current.get(id);
    if (existing && existing !== target) {
      warnTutorial("duplicate live target registration", { target: id });
    }
    targets.current.set(id, target);
    return () => {
      if (targets.current.get(id) === target) {
        targets.current.delete(id);
        if (stepRef.current?.target === id) {
          setTargetRect(null);
          setReady(false);
          setLayoutEpoch((value) => value + 1);
        }
      }
    };
  }, []);

  const registerController = useCallback((id, controller) => {
    const controllerSet = controllers.current.get(id) || new Set();
    controllerSet.add(controller || {});
    controllers.current.set(id, controllerSet);
    return () => {
      const current = controllers.current.get(id);
      current?.delete(controller);
      if (!current?.size) controllers.current.delete(id);
    };
  }, []);

  const notifyTargetLayout = useCallback((id) => {
    if (stepRef.current?.target !== id || !activeRef.current) return;
    setReady(false);
    setLayoutEpoch((value) => value + 1);
  }, []);

  const invalidateLayout = useCallback(() => {
    if (!activeRef.current) return;
    setReady(false);
    setLayoutEpoch((value) => value + 1);
  }, []);

  const startTutorial = useCallback(
    (id, { force = false } = {}) => {
      if (!TUTORIALS[id] || activeRef.current) return false;
      if (!force && !tutorialNeedsShowing(progress, id)) return false;
      setTargetRect(null);
      setReady(false);
      setStepIndex(0);
      setActive({ id, force });
      return true;
    },
    [progress]
  );

  const markHandled = useCallback(
    (status) => {
      if (!activeRef.current) return;
      const id = activeRef.current.id;
      const tutorial = TUTORIALS[id];
      const controllerSet = controllers.current.get(id);
      controllerSet?.forEach((controller) => controller?.cleanup?.());
      const nextEntry = { version: tutorial.version, status };
      setProgress((current) => ({ ...current, [id]: nextEntry }));
      setActive(null);
      setStepIndex(0);
      setTargetRect(null);
      setReady(false);
      if (user?.uid) {
        saveTutorialResult(user.uid, id, tutorial.version, status).then((result) => {
          if (!result.ok) console.debug("[Pulse] tutorial progress save failed", result.error);
        });
      }
    },
    [user?.uid]
  );

  useEffect(() => {
    if (!active) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      markHandled("skipped");
      return true;
    });
    return () => subscription.remove();
  }, [active, markHandled]);

  const resetAll = useCallback(async () => {
    setProgress({});
    setActive(null);
    setStepIndex(0);
    setTargetRect(null);
    setReady(false);
    if (!user?.uid) return { ok: false, error: "No user" };
    return resetTutorialProgress(user.uid);
  }, [user?.uid]);

  const tutorial = active ? TUTORIALS[active.id] : null;
  const step = tutorial?.steps?.[stepIndex] || null;
  stepRef.current = step;
  const routeKey = JSON.stringify(navigation?.currentRoute || null);
  const routeIsCorrect = routeMatches(navigation?.currentRoute, step?.route);

  useEffect(() => {
    if (!active || !step) return undefined;
    const generation = ++prepareGeneration.current;
    let cancelled = false;
    const isCurrent = () =>
      !cancelled && generation === prepareGeneration.current && activeRef.current?.id === active.id;

    const prepare = async () => {
      setMeasuring(true);
      setReady(false);
      setTargetRect(null);

      const requiredRoute = step.route;
      const routeAdapter = navigationRef.current;
      if (requiredRoute && routeAdapter?.currentRoute && !routeMatches(routeAdapter.currentRoute, requiredRoute)) {
        routeAdapter.ensureRoute?.(requiredRoute);
        const matched = await waitForValue(
          () => routeMatches(navigationRef.current?.currentRoute, requiredRoute),
          ROUTE_TIMEOUT
        );
        if (!matched || !isCurrent()) {
          if (isCurrent()) {
            warnTutorial("required route could not be restored", {
              tutorial: active.id,
              step: stepIndex + 1,
              requiredRoute,
              currentRoute: navigationRef.current?.currentRoute,
            });
            setMeasuring(false);
          }
          return;
        }
      }

      let controllerSet = controllers.current.get(active.id);
      if (step.before && !controllerAction(controllerSet, step.before)) {
        controllerSet = await waitForValue(
          () => {
            const current = controllers.current.get(active.id);
            return controllerAction(current, step.before) ? current : null;
          },
          TARGET_TIMEOUT
        );
      }
      if (!isCurrent()) return;
      if (step.before) {
        const action = controllerAction(controllerSet, step.before);
        if (!action) {
          warnTutorial("step preparation action is unavailable", {
            tutorial: active.id,
            step: stepIndex + 1,
            action: step.before,
          });
        } else {
          await action();
          await nextLayoutFrame();
        }
      }

      const target = await waitForValue(() => targets.current.get(step.target), TARGET_TIMEOUT);
      if (!isCurrent()) return;
      if (!target) {
        warnTutorial("target could not be found", {
          tutorial: active.id,
          step: stepIndex + 1,
          target: step.target,
        });
        setMeasuring(false);
        setReady(true);
        return;
      }

      try {
        await target.reveal?.();
        await target.scrollIntoView?.();
      } catch (error) {
        warnTutorial("target scroll failed", {
          tutorial: active.id,
          step: stepIndex + 1,
          target: step.target,
          error: error?.message || String(error),
        });
      }
      if (!isCurrent()) return;

      const measured = await waitForStableMeasurement(target, isCurrent);
      if (!isCurrent()) return;
      if (!rectIsValid(measured)) {
        warnTutorial("target measurement is invalid", {
          tutorial: active.id,
          step: stepIndex + 1,
          target: step.target,
          rect: measured,
        });
        setMeasuring(false);
        setReady(true);
        return;
      }

      const window = Dimensions.get("window");
      const viewport = { x: 0, y: 0, width: window.width, height: window.height };
      if (!rectVisibleInViewport(measured, viewport)) {
        warnTutorial("target is off-screen after attempted scrolling", {
          tutorial: active.id,
          step: stepIndex + 1,
          target: step.target,
          rect: measured,
          viewport,
        });
        setMeasuring(false);
        setReady(true);
        return;
      }

      setTargetRect(measured);
      setMeasuring(false);
      setReady(true);
    };

    prepare();
    return () => {
      cancelled = true;
    };
  }, [active, layoutEpoch, routeKey, step, stepIndex]);

  const next = useCallback(async () => {
    if (!tutorial || !active) return;
    setReady(false);
    setTargetRect(null);
    if (stepIndex < tutorial.steps.length - 1) {
      setStepIndex((index) => index + 1);
      return;
    }
    const lastStep = tutorial.steps[stepIndex];
    const finish = lastStep?.finish;
    const controllerSet = controllers.current.get(active.id);
    markHandled("completed");
    if (finish) controllerAction(controllerSet, finish)?.();
  }, [active, markHandled, stepIndex, tutorial]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    setReady(false);
    setTargetRect(null);
    setStepIndex((index) => index - 1);
  }, [stepIndex]);

  const value = useMemo(
    () => ({
      active,
      tutorial,
      step,
      stepIndex,
      targetRect,
      measuring,
      ready: ready && routeIsCorrect,
      progress,
      registerTarget,
      registerController,
      notifyTargetLayout,
      invalidateLayout,
      startTutorial,
      isHandled: (id) => !tutorialNeedsShowing(progress, id),
      next,
      back,
      skip: () => markHandled("skipped"),
      resetAll,
    }),
    [
      active,
      tutorial,
      step,
      stepIndex,
      targetRect,
      measuring,
      ready,
      routeIsCorrect,
      progress,
      registerTarget,
      registerController,
      notifyTargetLayout,
      invalidateLayout,
      startTutorial,
      next,
      back,
      markHandled,
      resetAll,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      <View style={styles.providerRoot}>
        {children}
        {active && !value.ready ? (
          <View style={[StyleSheet.absoluteFill, styles.transitionBlocker]} pointerEvents="auto" />
        ) : null}
        <TutorialOverlayHost scope="root" />
      </View>
    </TutorialContext.Provider>
  );
}

export function useTutorialContext() {
  return useContext(TutorialContext) || FALLBACK_CONTEXT;
}

export function useTutorial(tutorialId, { enabled = true, actions = {} } = {}) {
  const { active, progress, registerController, startTutorial, isHandled } = useTutorialContext();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const controller = useMemo(
    () => ({
      get actions() {
        return actionsRef.current;
      },
      cleanup: () => actionsRef.current?.cleanup?.(),
    }),
    []
  );

  useEffect(() => registerController(tutorialId, controller), [controller, registerController, tutorialId]);

  useEffect(() => {
    if (!enabled || active || isHandled(tutorialId)) return undefined;
    const timer = setTimeout(() => startTutorial(tutorialId), 450);
    return () => clearTimeout(timer);
  }, [active, enabled, isHandled, progress, startTutorial, tutorialId]);

  return {
    active: active?.id === tutorialId,
    handled: isHandled(tutorialId),
    start: () => startTutorial(tutorialId, { force: true }),
  };
}

function assignRef(forwardedRef, value) {
  if (typeof forwardedRef === "function") forwardedRef(value);
  else if (forwardedRef) forwardedRef.current = value;
}

export const TutorialScrollView = forwardRef(function TutorialScrollView(
  {
    children,
    onScroll,
    onLayout,
    onContentSizeChange,
    scrollEventThrottle,
    tutorialScrollRoot = false,
    ...props
  },
  forwardedRef
) {
  const nativeRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const parentContainers = useContext(TutorialScrollContext);
  const { invalidateLayout } = useTutorialContext();

  useImperativeHandle(forwardedRef, () => nativeRef.current);

  const controller = useMemo(
    () => ({
      async ensureVisible(measureTarget) {
        const node = nativeRef.current;
        if (!node?.measureInWindow || !node?.scrollTo) return false;
        const viewport = await new Promise((resolve) => {
          let settled = false;
          const timer = setTimeout(() => {
            if (!settled) resolve(null);
          }, 60);
          node.measureInWindow((x, y, width, height) => {
            settled = true;
            clearTimeout(timer);
            resolve({ x, y, width, height });
          });
        });
        const target = await measureTarget();
        if (!rectIsValid(viewport) || !rectIsValid(target)) return false;

        const nextY = calculateTutorialScrollOffset(target, viewport, offsetRef.current.y);
        if (Math.abs(nextY - offsetRef.current.y) <= LAYOUT_TOLERANCE) return true;
        offsetRef.current = { ...offsetRef.current, y: nextY };
        node.scrollTo({ y: nextY, animated: false });
        await nextLayoutFrame();
        await nextLayoutFrame();
        const after = await measureTarget();
        return rectVisibleInViewport(after, {
          x: viewport.x,
          y: viewport.y + VIEWPORT_MARGIN,
          width: viewport.width,
          height: Math.max(1, viewport.height - VIEWPORT_MARGIN * 2),
        });
      },
    }),
    []
  );
  const containers = useMemo(
    () => [controller, ...(tutorialScrollRoot ? [] : parentContainers)],
    [controller, parentContainers, tutorialScrollRoot]
  );

  return (
    <TutorialScrollContext.Provider value={containers}>
      <ScrollView
        {...props}
        ref={nativeRef}
        scrollEventThrottle={scrollEventThrottle || 16}
        onScroll={(event) => {
          offsetRef.current = event.nativeEvent?.contentOffset || offsetRef.current;
          onScroll?.(event);
        }}
        onLayout={(event) => {
          onLayout?.(event);
          invalidateLayout();
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          invalidateLayout();
        }}
      >
        {children}
      </ScrollView>
    </TutorialScrollContext.Provider>
  );
});

export const TutorialTarget = forwardRef(function TutorialTarget(
  { id, children, style, reveal, onLayout, ...viewProps },
  forwardedRef
) {
  const localRef = useRef(null);
  const revealRef = useRef(reveal);
  const scrollContainers = useContext(TutorialScrollContext);
  const { active, step, registerTarget, notifyTargetLayout } = useTutorialContext();
  revealRef.current = reveal;

  useEffect(() => {
    const measureAsync = () =>
      new Promise((resolve) => {
        const node = localRef.current;
        if (!node?.measureInWindow) return resolve(null);
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) resolve(null);
        }, 40);
        node.measureInWindow((x, y, width, height) => {
          settled = true;
          clearTimeout(timer);
          resolve({ x, y, width, height });
        });
      });
    const target = {
      reveal: () => revealRef.current?.(),
      measureAsync,
      scrollIntoView: async () => {
        for (const container of scrollContainers) {
          await container.ensureVisible(measureAsync);
        }
      },
    };
    return registerTarget(id, target);
  }, [id, registerTarget, scrollContainers]);

  const blocked = active && step?.target === id;
  return (
    <View
      {...viewProps}
      nativeID={viewProps.nativeID || id}
      ref={(node) => {
        localRef.current = node;
        assignRef(forwardedRef, node);
      }}
      collapsable={false}
      pointerEvents={blocked ? "none" : viewProps.pointerEvents}
      style={style}
      onLayout={(event) => {
        onLayout?.(event);
        notifyTargetLayout(id);
      }}
    >
      {children}
    </View>
  );
});

export function TutorialOverlayHost({ scope = "root" }) {
  const context = useContext(TutorialContext);
  const hostRef = useRef(null);
  const dimensions = useWindowDimensions();
  const [hostRect, setHostRect] = useState(null);
  const stepHost = context?.step?.host || "root";
  const activeHere = Boolean(context?.active && context?.step && stepHost === scope);

  const measureHost = useCallback(() => {
    const node = hostRef.current;
    if (!node?.measureInWindow) {
      setHostRect({ x: 0, y: 0, width: dimensions.width, height: dimensions.height });
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) setHostRect({ x: 0, y: 0, width: dimensions.width, height: dimensions.height });
    }, 50);
    node.measureInWindow((x, y, width, height) => {
      settled = true;
      clearTimeout(timer);
      if (width > 0 && height > 0) setHostRect({ x, y, width, height });
    });
  }, [dimensions.height, dimensions.width]);

  useEffect(() => {
    if (activeHere) measureHost();
  }, [activeHere, measureHost]);

  if (!activeHere) return null;
  return (
    <View
      ref={hostRef}
      nativeID={`tutorial-overlay-${scope}`}
      style={[StyleSheet.absoluteFill, styles.overlayHost]}
      pointerEvents="box-none"
      onLayout={measureHost}
    >
      {context.ready && hostRect ? <TutorialOverlay context={context} hostRect={hostRect} /> : null}
    </View>
  );
}

function TutorialOverlay({ context, hostRect }) {
  const { tutorial, step, stepIndex, targetRect, next, back, skip } = context;
  const insets = useSafeAreaInsets();
  const dimensions = useWindowDimensions();
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const rect = targetRectForOverlay(targetRect, hostRect);
  const safeTop = Math.max(VIEWPORT_MARGIN, insets.top - hostRect.y + VIEWPORT_MARGIN);
  const safeBottom = Math.min(
    hostRect.height - VIEWPORT_MARGIN,
    dimensions.height - insets.bottom - hostRect.y - VIEWPORT_MARGIN
  );
  const maxTooltipHeight = Math.max(180, safeBottom - safeTop);
  const cardHeight = Math.min(tooltipHeight, maxTooltipHeight);
  const below = rect ? rect.y + rect.height + VIEWPORT_MARGIN : safeTop;
  const above = rect ? rect.y - VIEWPORT_MARGIN - cardHeight : safeTop;
  let tooltipTop = safeTop;
  if (tooltipHeight > 0 && rect) {
    if (below + cardHeight <= safeBottom) tooltipTop = below;
    else if (above >= safeTop) tooltipTop = above;
    else tooltipTop = Math.max(safeTop, Math.min(below, safeBottom - cardHeight));
  } else if (tooltipHeight > 0) {
    tooltipTop = Math.max(safeTop, Math.min(safeTop + maxTooltipHeight * 0.2, safeBottom - cardHeight));
  }
  const last = stepIndex === tutorial.steps.length - 1;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayRoot]} pointerEvents="auto" accessibilityViewIsModal>
      {rect && rect.width > 0 && rect.height > 0 ? (
        <>
          <View style={[styles.shade, { left: 0, right: 0, top: 0, height: rect.y }]} />
          <View style={[styles.shade, { left: 0, right: 0, top: rect.y + rect.height, bottom: 0 }]} />
          <View style={[styles.shade, { left: 0, top: rect.y, width: rect.x, height: rect.height }]} />
          <View
            style={[
              styles.shade,
              { left: rect.x + rect.width, right: 0, top: rect.y, height: rect.height },
            ]}
          />
          <Pressable
            testID="tutorial-spotlight-blocker"
            onPress={() => {}}
            accessible={false}
            style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          />
          <View
            testID="tutorial-focus-ring"
            pointerEvents="none"
            style={[styles.focusRing, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]}
          />
        </>
      ) : (
        <View style={[styles.shade, StyleSheet.absoluteFill]} />
      )}

      <View
        testID="tutorial-tooltip"
        style={[
          styles.tooltip,
          shadow("lg"),
          {
            top: tooltipTop,
            maxHeight: maxTooltipHeight,
            opacity: tooltipHeight > 0 ? 1 : 0,
          },
        ]}
        onLayout={(event) => setTooltipHeight(event.nativeEvent.layout.height)}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${step.title}. ${step.body}`}
      >
        <View style={styles.tooltipTop}>
          <Text style={styles.eyebrow}>
            {tutorial.title} · {stepIndex + 1}/{tutorial.steps.length}
          </Text>
          <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Skip tutorial">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.tooltipScroll} contentContainerStyle={styles.tooltipScrollContent}>
          <Text style={styles.tooltipTitle}>{step.title}</Text>
          <Text style={styles.tooltipBody}>{step.body}</Text>
        </ScrollView>
        <View style={styles.tooltipActions}>
          {stepIndex > 0 ? (
            <Pressable onPress={back} accessibilityRole="button" style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={next} accessibilityRole="button" style={styles.nextButton}>
            <Text style={styles.nextText}>{step.ctaLabel || (last ? "Done" : "Next")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  providerRoot: { flex: 1 },
  transitionBlocker: { zIndex: 9998, elevation: 9998 },
  overlayHost: { zIndex: 9999, elevation: 9999 },
  overlayRoot: { zIndex: 9999, elevation: 9999 },
  shade: { position: "absolute", backgroundColor: "rgba(21, 24, 28, 0.72)" },
  focusRing: {
    position: "absolute",
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.pulseAccent,
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    zIndex: 10000,
  },
  tooltipTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  eyebrow: { ...type.caption, flex: 1, color: colors.pulsePrimaryDark, fontFamily: fonts.bold },
  skip: { ...type.label, color: colors.textMuted },
  tooltipScroll: { flexShrink: 1 },
  tooltipScrollContent: { gap: spacing.sm },
  tooltipTitle: { ...type.h3, color: colors.text },
  tooltipBody: { ...type.body, color: colors.textMuted },
  tooltipActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  backButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  backText: { ...type.label, color: colors.blPrimary },
  nextButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blPrimary,
  },
  nextText: { ...type.label, color: colors.blOnPrimary },
});
