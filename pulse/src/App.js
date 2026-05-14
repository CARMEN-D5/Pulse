import React, { useEffect, useRef, useState } from "react";
import "./App.css";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import EntryQuiz from "./pages/EntryQuiz";
import SpiritualityPage from "./pages/SpiritualityPage";
import RelationshipsPage from "./pages/RelationshipsPage";
import HealthPage from "./pages/HealthPage";
import ProductivityPage from "./pages/ProductivityPage";
import FinancePage from "./pages/FinancePage";
import {
  signUp,
  logIn,
  logOut,
  resetPassword,
  onAuthChange,
} from "./auth/authService";
import { ensureUserDoc, getUserDoc } from "./firestore/users";
import { saveOnboardingBaseline } from "./firestore/scoring";

const DOMAIN_PAGE_MAP = {
  spirituality:  SpiritualityPage,
  relationships: RelationshipsPage,
  health:        HealthPage,
  productivity:  ProductivityPage,
  finance:       FinancePage,
};

function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [activeDomain, setActiveDomain] = useState(null);
  const [scoreVersion, setScoreVersion] = useState(0);

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

        const AUTHED_VIEWS = ["home", "domain"];
        setView((current) => {
          if (isNewSignUp.current) return "entryQuiz";
          if (!data?.onboardingCompletedAt) return "entryQuiz";
          return AUTHED_VIEWS.includes(current) ? current : "home";
        });
      } else {
        setUserDoc(null);
        const AUTHED_VIEWS = ["home", "domain", "entryQuiz"];
        setView((current) => (AUTHED_VIEWS.includes(current) ? "splash" : current));
      }
    });
    return unsubscribe;
  }, []);

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

  const handleDomainSelect = (domainKey) => {
    if (DOMAIN_PAGE_MAP[domainKey]) {
      setActiveDomain(domainKey);
      setView("domain");
    }
  };

  const handleDomainBack = () => {
    setActiveDomain(null);
    setView("home");
  };

  // Called whenever a reflection or action is logged inside a domain page.
  // Incrementing scoreVersion causes Home to re-fetch and recompute scores.
  const handleActivityLogged = () => {
    setScoreVersion(v => v + 1);
  };

  // Brief splash-coloured placeholder while Firebase restores the session.
  if (!authReady) {
    return (
      <div className="auth-shell">
        <div
          className="pulse-logo"
          style={{ fontSize: 28, color: "#c9184a" }}
          aria-label="Loading Pulse"
        >
          <span className="pulse-logo-dot" aria-hidden="true" />
          Pulse
        </div>
      </div>
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
      return (
        <div className="auth-shell">
          <EntryQuiz
            onComplete={handleEntryQuizComplete}
            loading={onboardingLoading}
          />
        </div>
      );

    case "domain": {
      const DomainComp = DOMAIN_PAGE_MAP[activeDomain];
      return DomainComp ? (
        <DomainComp
          domainScore={userDoc?.domainScores?.[activeDomain] ?? userDoc?.onboardingBaseline?.[activeDomain]}
          user={user}
          onBack={handleDomainBack}
          onActivityLogged={handleActivityLogged}
        />
      ) : null;
    }

    case "home":
      return (
        <Home
          user={user}
          userDoc={userDoc}
          scoreVersion={scoreVersion}
          onDomainSelect={handleDomainSelect}
          onOpenDomain={handleDomainSelect}
          onNevigate={handleDomainSelect}
          onLogout={handleLogout}
        />
      );

    case "splash":
    default:
      return (
        <Splash
          onLogin={() => setView("login")}
          onSignUp={() => setView("signup")}
        />
      );
  }
}

export default App;
