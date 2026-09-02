import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Social, { displayNameFor } from "./pages/Social";
import { SharePromptProvider, resetSharePromptHistory } from "./components/share";
import { firstTutorialRoute, TutorialProvider, useTutorialContext } from "./tutorial";
import { createAchievementPost } from "./firestore/social";
import { getOrCreateConversation, sendMessage } from "./firestore/messaging";
import {
  signUp,
  logIn,
  logOut,
  resetPassword,
  onAuthChange,
} from "./auth/authService";
import { ensureUserDoc, getUserDoc } from "./firestore/users";
import { saveOnboardingBaseline } from "./firestore/scoring";

// Privacy (Privacy Act 1988 (Cth)). Two gates, at two different moments:
//
//   ConsentModal   APP 5 collection notice. Once per device, over Splash,
//                  before the signup form collects name and email. Not a
//                  consent record — just "this handset has been told".
//   ConsentScreen  The account-level consent, including the APP 3.3 answers.
//                  Its own view between signup and the entry quiz.
//
// See src/privacy/consentNotice.js for the APP references and reasoning.
import ConsentModal from "./privacy/ConsentModal";
import ConsentScreen from "./privacy/ConsentScreen";
import { SENSITIVE_DOMAINS } from "./privacy/consentNotice";
import {
  acceptAccountConsent,
  accountConsented,
  acknowledgeNotice,
  clearAccountConsent,
  noticeAcknowledged,
  readLocalConsent,
  syncConsent,
  writeLocalConsent,
  writeProfileConsent,
} from "./privacy/consentStore";

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
 *   consent    -> account-level privacy consent (APP 3.3 + optional extras)
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
 *
 * `consent` sits ahead of `entryQuiz` rather than overlaying it, so the
 * consent reads as part of registration and the quiz never renders behind it.
 */
function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [activeDomain, setActiveDomain] = useState(null);
  const [scoreVersion, setScoreVersion] = useState(0);
  const [tutorialRequest, setTutorialRequest] = useState(null);
  // Tab a stacked page was opened from, so dismissing it lands back there
  // rather than always on Home.
  const [tabReturn, setTabReturn] = useState("home");

  // Privacy consent, reconciled between AsyncStorage (device) and
  // /users/{uid}.privacyConsent (account). `consentReady` gates the notice so
  // it does not flash open during the first async read.
  const [consent, setConsent] = useState(null);
  const [consentReady, setConsentReady] = useState(false);
  const [noticeDeclined, setNoticeDeclined] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);

  const fontsReady = useAppFonts();

  // Tracks whether the current auth event was triggered by a new sign-up.
  // Using a ref so handleSignUpSubmit can set it before onAuthChange fires.
  const isNewSignUp = useRef(false);

  // Read the device consent record once on mount, so the APP 5 notice can be
  // shown over Splash before there is a uid to write against.
  useEffect(() => {
    let alive = true;
    readLocalConsent().then((record) => {
      if (!alive) return;
      setConsent(record);
      setConsentReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Subscribe to Firebase auth state. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
        const { data } = await getUserDoc(firebaseUser.uid);
        setUserDoc(data);

        // Reconcile device and account records. The profile wins for the
        // account half, so someone who consented on another handset is not
        // asked again here.
        const reconciled = await syncConsent(firebaseUser.uid, data);
        setConsent(reconciled);
        setConsentReady(true);

        // Routing rules, in order:
        //   1. No account-level consent yet → consent view. This covers a new
        //      sign-up, an account predating the feature, and a version bump.
        //   2. Brand-new sign-up → entry quiz
        //   3. Existing user without a saved baseline → entry quiz
        //   4. Otherwise preserve any current authed view, default to home
        const AUTHED_VIEWS = [...TAB_VIEWS, ...STACKED_VIEWS];
        setView((current) => {
          if (!accountConsented(reconciled)) return "consent";
          if (isNewSignUp.current) return "entryQuiz";
          if (!data?.onboardingCompletedAt) return "entryQuiz";
          return AUTHED_VIEWS.includes(current) ? current : "home";
        });
      } else {
        setUserDoc(null);
        setNoticeDeclined(false);
        const AUTHED_VIEWS = [...TAB_VIEWS, ...STACKED_VIEWS, "consent", "entryQuiz"];
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
  // is what should happen on Home and Splash — and on `consent`, which must
  // not be dismissable by the back button.
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

  /* ---------------- privacy ---------------- */

  // APP 5 notice, device level. Acknowledging is not a consent record, so it
  // is written locally only — there is no signed-in user at this point.
  const handleNoticeAcknowledge = async () => {
    const record = acknowledgeNotice(consent);
    await writeLocalConsent(record);
    setConsent(record);
  };

  // Declining the notice is valid. Nothing is written and nothing collected;
  // the user stays on Splash. Re-opening the app asks again, because the
  // notice still has to precede any collection.
  const handleNoticeDecline = () => setNoticeDeclined(true);

  // Account-level consent, from the `consent` view. Writes both stores, then
  // hands off to the rest of registration.
  const handleConsentComplete = async (choices) => {
    setConsentSaving(true);
    const record = acceptAccountConsent(consent, choices);
    await writeLocalConsent(record);
    if (user?.uid) await writeProfileConsent(user.uid, record);
    setConsent(record);
    setConsentSaving(false);
    setView(userDoc?.onboardingCompletedAt ? "home" : "entryQuiz");
  };

  // Domains the user declined at the APP 3.3 gate. EntryQuiz skips these, so
  // the ratings are never collected rather than collected and then discarded.
  const excludedDomains = Object.entries(SENSITIVE_DOMAINS)
      .filter(([, field]) => !consent?.[field])
      .map(([domainId]) => domainId);

  // Shown only while signed out, and only until this device has acknowledged
  // it. Both conditions matter: `!user` keeps it off every authed screen, and
  // the acknowledgement survives logout so it does not reappear on Splash
  // after signing out. A second person signing up on this handset still gets
  // their own account-level gate, so nothing is lost by not repeating it.
  const needsNotice =
      consentReady && authReady && !user && !noticeAcknowledged(consent) && !noticeDeclined;

  /* ----------------------------------------- */

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
    // onAuthChange will push us to "consent", "entryQuiz" or "home" on success.
    return result;
  };

  const handleSignUpSubmit = async ({ name, email, password }) => {
    // Set before signUp so onAuthChange routes into onboarding.
    isNewSignUp.current = true;
    const result = await signUp({ name, email, password });
    return result;
  };

  const handleResetSubmit = async ({ email }) => resetPassword({ email });

  const handleLogout = async () => {
    await logOut();
    // Prompt history is per-session and in-memory, so the next account on this
    // device gets its own share prompts.
    resetSharePromptHistory();
    // Drop this account's consent answers but keep the device's notice
    // acknowledgement — otherwise the notice reappears on the logged-out
    // splash screen, where nothing is being collected and it has no business
    // being. The next person to sign up passes through the `consent` view
    // regardless, which is the gate that actually matters.
    const cleared = await clearAccountConsent();
    setConsent(cleared);
    setNoticeDeclined(false);
    setView("splash");
  };

  // Hands a finished share off to Firestore as an achievement post. Returns
  // the { ok, error } shape the share modal expects, so a failed write shows
  // its error inline instead of closing the modal.
  const handleSharePost = (post) =>
      createAchievementPost({
        ...post,
        authorUid: user.uid,
        authorName: displayNameFor(user),
      });

  // Send a share as a DM instead of posting to the feed. Gets or creates
  // the conversation with the chosen friend, then sends one message that
  // combines the reflection text and (optionally) the picked image. The
  // achievement template's title is prepended so context is preserved.
  const handleShareDm = async ({ friend, reflection, imageUrl }) => {
    if (!user?.uid || !friend?.uid) {
      return { ok: false, error: "Missing user or friend." };
    }
    const conv = await getOrCreateConversation(
      { uid: user.uid, name: displayNameFor(user), email: user.email },
      { uid: friend.uid, name: friend.name, email: friend.email, displayName: friend.name }
    );
    if (!conv.ok || !conv.data?.id) {
      return { ok: false, error: conv.error || "Couldn't open that chat." };
    }
    return sendMessage(conv.data.id, {
      senderUid: user.uid,
      text: reflection,
      imageUrl: imageUrl || null,
      imagePath: null, // path lives with the sender's post history if needed
    });
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

  // Tutorial navigation uses the same view state as the app, but only this
  // adapter may restore a route while a tutorial is active. Normal navigation
  // handlers remain unchanged when no tutorial is running.
  const ensureTutorialRoute = useCallback((route) => {
    if (!route?.view) return;
    setActiveDomain(route.view === "domain" ? route.domain || null : null);
    setView(route.view);
  }, []);

  const tutorialNavigation = useMemo(
    () => ({
      currentRoute: { view, domain: view === "domain" ? activeDomain : null },
      ensureRoute: ensureTutorialRoute,
    }),
    [activeDomain, ensureTutorialRoute, view]
  );

  const handleReplayTutorial = (tutorialId) => {
    setTabReturn("profile");
    ensureTutorialRoute(firstTutorialRoute(tutorialId));
    setTutorialRequest({ id: tutorialId, nonce: Date.now() });
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

      case "consent":
        return <ConsentScreen onComplete={handleConsentComplete} loading={consentSaving} />;

      case "entryQuiz":
        return (
            <EntryQuiz
                onComplete={handleEntryQuizComplete}
                loading={onboardingLoading}
                excludeDomains={excludedDomains}
            />
        );

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
            tutorialTab={tutorialRequest?.id === "savingOverview" ? "saving" : undefined}
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
        return (
          <Profile
            user={user}
            onLogout={handleLogout}
            onReplayTutorial={handleReplayTutorial}
          />
        );

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
  // view (auth, consent, entry quiz, stacked pages) fills the screen on its own.
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
  // The share prompt lives above the view switch rather than inside any single
  // page, so a prompt raised on one domain survives navigating away.
  // The APP 5 notice sits alongside it because it has to be able to cover
  // Splash, a view the switch owns. The account-level consent is a real view
  // in that switch instead, so nothing renders behind it.
  return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <TutorialProvider
            user={user}
            initialProgress={userDoc?.tutorialProgress}
            navigation={tutorialNavigation}
        >
          <SharePromptProvider
              user={user}
              onPost={handleSharePost}
              onDm={handleShareDm}
              onOpenSocial={() => setView("social")}
          >
            {screen()}
          </SharePromptProvider>
          <TutorialLauncher
              request={tutorialRequest}
              onConsumed={() => setTutorialRequest(null)}
          />
        </TutorialProvider>

        <ConsentModal
            visible={needsNotice}
            onAcknowledge={handleNoticeAcknowledge}
            onDecline={handleNoticeDecline}
        />
      </SafeAreaProvider>
  );
}

function TutorialLauncher({ request, onConsumed }) {
  const { active, startTutorial } = useTutorialContext();

  useEffect(() => {
    if (!request?.id) return undefined;
    if (active?.id === request.id) {
      onConsumed?.();
      return undefined;
    }
    if (active) return undefined;

    const timer = setTimeout(() => {
      if (startTutorial(request.id, { force: true })) onConsumed?.();
    }, 700);
    return () => clearTimeout(timer);
  }, [active, onConsumed, request, startTutorial]);

  return null;
}

export default App;