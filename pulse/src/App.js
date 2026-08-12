import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppShell from "./components/AppShell";
import { Loading, Screen } from "./components/ui";
import useAppFonts from "./hooks/useAppFonts";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import EntryQuiz from "./pages/EntryQuiz";
import Features from "./pages/Features";
import Profile from "./pages/Profile";
import SpiritualityPage from "./pages/SpiritualityPage";
import RelationshipsPage from "./pages/RelationshipsPage";
import HealthPage from "./pages/HealthPage";
import PhysicalActivity from "./pages/PhysicalActivity";
import TodoList from "./pages/TodoList";
import Finance from "./pages/Finance";
import DailyMissionsPage from "./pages/DailyMissionsPage";
import Social from "./pages/Social";
import {
  signUp,
  logIn,
  logOut,
  resetPassword,
  onAuthChange,
} from "./auth/authService";
import { ensureUserDoc, getUserDoc } from "./firestore/users";
import { saveOnboardingBaseline } from "./firestore/scoring";

// Maps a domain key to the page component used when the user opens that
// domain from Home. Finance has its own rich budget-tracker page and
// Productivity routes to the To-Do list — both handled separately below.
const DOMAIN_PAGE_MAP = {
  spirituality:  SpiritualityPage,
  relationships: RelationshipsPage,
  health:        PhysicalActivity,
};

// The four root destinations behind the bottom tab bar. These render inside
// <AppShell>; every other authed view is a stacked page with its own back
// affordance and no tab bar.
const TAB_VIEWS = ["home", "features", "social", "profile"];

// Stacked pages: reached from a domain row on Home or from the Features menu,
// and dismissed back to whichever tab opened them (tracked in `tabReturn`).
const STACKED_VIEWS = ["finance", "domain", "todo", "missions"];

// Auth screens whose back button returns to the splash screen.
const BACK_TO_SPLASH_VIEWS = ["login", "signup", "reset"];

/**
 * Top-level view state for Pulse.
 *
 * Flow:
 *   splash     -> entry / "Already a member?"
 *   login      -> "Enter username/email and password"
 *   signup     -> "Complete Registration"
 *   reset      -> "Reset Password"
 *   entryQuiz  -> first-time 1-5 baseline ratings
 *
 * Then four tabs behind the bottom bar:
 *   home       -> dashboard (missions + domain overview)
 *   features   -> Tools menu
 *   social     -> feed, daily post and DMs
 *   profile    -> account header + progress analytics
 *
 * and the stacked pages those tabs push:
 *   domain     -> generic per-domain reflection/action logging
 *   finance    -> rich budget-tracker (Finance-BudgetTracker branch)
 *   todo       -> To-do list (productivity domain, to-do-list branch)
 *   missions   -> today's daily missions, full screen
 *
 * Auth is provided by Firebase (see src/firebase.js + src/auth/authService.js).
 * `onAuthChange` keeps the view in sync with Firebase's persisted session, so
 * a returning user is taken straight to Home when the app relaunches.
 */
function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [activeDomain, setActiveDomain] = useState(null);
  const [scoreVersion, setScoreVersion] = useState(0);
  // Tab a stacked page was opened from, so dismissing it lands back there
  // rather than always on Home.
  const [tabReturn, setTabReturn] = useState("home");

  const fontsReady = useAppFonts();

  // Tracks whether the current auth event was triggered by a new sign-up.
  // Using a ref so handleSignUpSubmit can set it before onAuthChange fires.
  const isNewSignUp = useRef(false);

  // Subscribe to Firebase auth state. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
        const { data } = await getUserDoc(firebaseUser.uid);
        setUserDoc(data);

        // Routing rules:
        //   1. Brand-new sign-up → entry quiz
        //   2. Existing user without a saved baseline → entry quiz
        //   3. Otherwise preserve any current authed view, default to home
        const AUTHED_VIEWS = [...TAB_VIEWS, ...STACKED_VIEWS];
        setView((current) => {
          if (isNewSignUp.current) return "entryQuiz";
          if (!data?.onboardingCompletedAt) return "entryQuiz";
          return AUTHED_VIEWS.includes(current) ? current : "home";
        });
      } else {
        setUserDoc(null);
        const AUTHED_VIEWS = [...TAB_VIEWS, ...STACKED_VIEWS, "entryQuiz"];
        setView((current) => (AUTHED_VIEWS.includes(current) ? "splash" : current));
      }
    });
    return unsubscribe;
  }, []);

  const goBack = useCallback(() => {
    setActiveDomain(null);
    setView((current) => {
      if (STACKED_VIEWS.includes(current)) return tabReturn;
      if (BACK_TO_SPLASH_VIEWS.includes(current)) return "splash";
      return current;
    });
  }, [tabReturn]);

  // Android hardware back button. Returning true tells the OS we handled the
  // press; returning false lets it fall through and background the app, which
  // is what should happen on Home and Splash.
  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const canGoBack =
      STACKED_VIEWS.includes(view) || BACK_TO_SPLASH_VIEWS.includes(view);

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack) return false;
      goBack();
      return true;
    });

    return () => subscription.remove();
  }, [view, goBack]);

  // EntryQuiz returns an array of { domain, score } using the entry-quiz
  // branch's domain ids (family_friends / work_productivity / financial).
  // Map them to the keys used by the scoring engine before saving.
  const ENTRY_QUIZ_KEY_MAP = {
    spirituality:      "spirituality",
    family_friends:    "relationships",
    work_productivity: "productivity",
    health:            "health",
    financial:         "finance",
  };

  const handleEntryQuizComplete = async (entries) => {
    setOnboardingLoading(true);
    const ratings = {};
    for (const { domain, score } of entries) {
      const key = ENTRY_QUIZ_KEY_MAP[domain] ?? domain;
      ratings[key] = score;
    }
    const result = await saveOnboardingBaseline(user.uid, ratings);
    if (result.ok) {
      const { data } = await getUserDoc(user.uid);
      setUserDoc(data);
      isNewSignUp.current = false;
      setView("home");
    }
    setOnboardingLoading(false);
  };

  const handleLoginSubmit = async ({ email, password }) => {
    const result = await logIn({ email, password });
    // onAuthChange will push us to "home" or "entryQuiz" on success.
    return result;
  };

  const handleSignUpSubmit = async ({ name, email, password }) => {
    // Set before signUp so onAuthChange routes to the entry quiz.
    isNewSignUp.current = true;
    const result = await signUp({ name, email, password });
    return result;
  };

  const handleResetSubmit = async ({ email }) => resetPassword({ email });

  const handleLogout = async () => {
    await logOut();
    setView("splash");
  };

  // Domain card on Home was tapped. Each domain has its own destination:
  //   finance       -> rich budget-tracker page
  //   productivity  -> to-do list page
  //   others        -> generic DomainPage (reflection + action logging)
  const handleDomainSelect = (domainKey) => {
    setTabReturn("home");
    if (domainKey === "finance") {
      setView("finance");
      return;
    }
    if (domainKey === "productivity") {
      setView("todo");
      return;
    }
    if (DOMAIN_PAGE_MAP[domainKey]) {
      setActiveDomain(domainKey);
      setView("domain");
    }
  };

  // Tool tapped in the Features menu. Tools map onto the same pages the domain
  // rows open, so this only translates the tool id and remembers to come back
  // to the Features tab.
  const handleToolSelect = (toolId) => {
    setTabReturn("features");
    if (toolId === "journal") {
      setActiveDomain("spirituality");
      setView("domain");
      return;
    }
    if (toolId === "activity") {
      setActiveDomain("health");
      setView("domain");
      return;
    }
    setView(toolId); // "todo" | "finance" | "missions"
  };

  const handleStackedBack = () => {
    setActiveDomain(null);
    setView(tabReturn);
  };

  // Called whenever a reflection or action is logged inside a domain page.
  // Incrementing scoreVersion causes Home to re-fetch and recompute scores.
  const handleActivityLogged = () => {
    setScoreVersion((v) => v + 1);
  };

  const content = () => {
    // Hold on the splash colour while Firebase restores the session and the
    // Manrope files load — swapping fonts mid-render would reflow every screen.
    if (!authReady || !fontsReady) {
      return (
        <Screen scroll={false} center keyboardAvoiding={false}>
          <Loading label="Pulse" />
        </Screen>
      );
    }

    switch (view) {
      case "login":
        return (
          <Login
            onSubmit={handleLoginSubmit}
            onForgotPassword={() => setView("reset")}
            onBack={() => setView("splash")}
            onSwitchToSignUp={() => setView("signup")}
          />
        );

      case "signup":
        return (
          <SignUp
            onSubmit={handleSignUpSubmit}
            onExit={() => setView("splash")}
            onSwitchToLogin={() => setView("login")}
          />
        );

      case "reset":
        return (
          <ResetPassword
            onSubmit={handleResetSubmit}
            onBackToLogin={() => setView("login")}
          />
        );

      case "entryQuiz":
        return <EntryQuiz onComplete={handleEntryQuizComplete} loading={onboardingLoading} />;

      case "domain": {
        const DomainPage = DOMAIN_PAGE_MAP[activeDomain];
        return DomainPage ? (
          <DomainPage
            domainScore={
              userDoc?.domainScores?.[activeDomain] ??
              userDoc?.onboardingBaseline?.[activeDomain]
            }
            user={user}
            onBack={handleStackedBack}
            onActivityLogged={handleActivityLogged}
          />
        ) : null;
      }

      case "finance":
        return (
          <Finance
            user={user}
            onBack={handleStackedBack}
            onActivityLogged={handleActivityLogged}
          />
        );

      case "todo":
        return (
          <TodoList
            user={user}
            onBack={handleStackedBack}
            onActivityLogged={handleActivityLogged}
          />
        );

      case "missions":
        return (
          <DailyMissionsPage
            user={user}
            userDoc={userDoc}
            scoreVersion={scoreVersion}
            onBack={handleStackedBack}
          />
        );

      case "social":
        return (
          <Social user={user} onActivityLogged={handleActivityLogged} />
        );

      case "features":
        return <Features onOpen={handleToolSelect} />;

      case "profile":
        return <Profile user={user} onLogout={handleLogout} />;

      case "home":
        return (
          <Home
            user={user}
            userDoc={userDoc}
            scoreVersion={scoreVersion}
            onDomainSelect={handleDomainSelect}
            onOpenDomain={handleDomainSelect}
            onNevigate={handleDomainSelect}
          />
        );

      case "splash":
      default:
        return <Splash onLogin={() => setView("login")} onSignUp={() => setView("signup")} />;
    }
  };

  // The four tabs share the PULSE app bar and the bottom tab bar; every other
  // view (auth, entry quiz, stacked pages) fills the screen on its own.
  const screen = () => {
    const body = content();
    if (!TAB_VIEWS.includes(view)) return body;

    const displayName =
      user?.displayName || user?.name || user?.email || "";
    return (
      <AppShell
        tab={view}
        onTabChange={setView}
        initials={displayName ? displayName.charAt(0).toUpperCase() : null}
      >
        {body}
      </AppShell>
    );
  };

  // SafeAreaProvider has to wrap everything: the Screen primitive reads the
  // notch/home-indicator insets through useSafeAreaInsets.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen()}
    </SafeAreaProvider>
  );
}

export default App;
