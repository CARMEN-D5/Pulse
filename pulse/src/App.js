import React, { useEffect, useState } from "react";
import "./App.css";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import SpiritualityPage from "./pages/SpiritualityPage";
import RelationshipsPage from "./pages/RelationshipsPage";
import ProductivityPage from "./pages/ProductivityPage";
import HealthPage from "./pages/HealthPage";
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
  productivity:  ProductivityPage,
  health:        HealthPage,
  finance:       FinancePage,
};

/**
 * Top-level view state for the login branch of Pulse.
 *
 * Flow (mirrors the user-flow chart):
 *   splash     -> entry / "Already a member?"
 *   login      -> "Enter username/email and password"
 *   signup     -> "Complete Registration"
 *   reset      -> "Reset Password"
 *   home       -> "User Logged In -> Home Page"
 *
 * Auth is provided by Firebase (see src/firebase.js + src/auth/authService.js).
 * `onAuthChange` keeps the view in sync with Firebase's persisted session, so
 * a returning user is taken straight to Home on refresh.
 */
function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [activeDomain, setActiveDomain] = useState(null);
  const [scoreVersion, setScoreVersion] = useState(0);

  // Subscribe to Firebase auth state. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser) {
        await ensureUserDoc(firebaseUser);
        const { data } = await getUserDoc(firebaseUser.uid);
        setUserDoc(data);
        // Route to onboarding if the user hasn't completed baseline ratings yet
        setView(data?.onboardingCompletedAt ? "home" : "onboarding");
      } else {
        setUserDoc(null);
        setView((current) => (current === "home" || current === "onboarding" ? "splash" : current));
      }
    });
    return unsubscribe;
  }, []);

  const handleOnboardingComplete = async (ratings) => {
    setOnboardingLoading(true);
    const result = await saveOnboardingBaseline(user.uid, ratings);
    if (result.ok) {
      const { data } = await getUserDoc(user.uid);
      setUserDoc(data);
      setView("home");
    }
    setOnboardingLoading(false);
  };

  const handleLoginSubmit = async ({ email, password }) => {
    const result = await logIn({ email, password });
    // onAuthChange will push us to "home" on success.
    return result;
  };

  const handleSignUpSubmit = async ({ name, email, password }) => {
    const result = await signUp({ name, email, password });
    return result;
  };

  const handleResetSubmit = async ({ email }) => resetPassword({ email });

  const handleLogout = async () => {
    await logOut();
    setView("splash");
  };

  const handleDomainSelect = (domainKey) => {
    setActiveDomain(domainKey);
    setView("domain");
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

    case "onboarding":
      return (
        <Onboarding
          onComplete={handleOnboardingComplete}
          loading={onboardingLoading}
        />
      );

    case "domain": {
      const DomainPage = DOMAIN_PAGE_MAP[activeDomain];
      return DomainPage ? (
        <DomainPage
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
