import React, { useEffect, useRef, useState } from "react";
import "./App.css";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import EntryQuiz from "./pages/EntryQuiz"

import {
  signUp,
  logIn,
  logOut,
  resetPassword,
  onAuthChange,
} from "./auth/authService";
import { ensureUserDoc } from "./firestore/users";

/**
 * Top-level view state for the login branch of Pulse.
 *
 * Flow (mirrors the user-flow chart):
 *   splash     -> entry / "Already a member?"
 *   login      -> "Enter username/email and password"
 *   signup     -> "Complete Registration"
 *   reset      -> "Reset Password"
 *   entry quiz -> one-time prompt/onboarding step for new users
 *   home       -> "User Logged In -> Home Page"
 *
 * Auth is provided by Firebase (see src/firebase.js + src/auth/authService.js).
 * `onAuthChange` keeps the view in sync with Firebase's persisted session, so
 * a returning user is taken straight to Home on refresh.
 */
function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // tracks whteher the current auth event was triggered by a new sign-up.
  // using a ref so handleSignUpSubmit can set it before onAuthChange fires
  const isNewSignUp = useRef(false);

  // Subscribe to Firebase auth state. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser && !isNewSignUp.current) {
        // returning user restoring their session/page refresh
        await ensureUserDoc(firebaseUser);
        setView("home");
      }
        if (!firebaseUser) {
          setView((current) => (current === "home" ? "splash" : current));
        }

        /*// new sign-ups are sent to the entry quiz; returning users are sent to home
        if (isNewSignUp.current) {
          isNewSignUp.current = false;
          setView("entryQuiz");
        } else {
          setView("home");
        }
      } else {
        setView((current) => (current === "home" ? "splash" : current));
      }
      /*
      // Backfill / touch the users/{uid} doc whenever someone's logged in.
      // Fire-and-forget — don't block UI on Firestore.
      if (firebaseUser) ensureUserDoc(firebaseUser);
      // Auto-route: logged-in users land on home, logged-out users on splash
      // unless they've navigated somewhere explicit already.
      setView((current) => {
        if (firebaseUser) return "home";
        if (current === "home") return "splash";
        return current;
      }); */
    });
    return unsubscribe;
  }, []);

  const handleLoginSubmit = async ({ email, password }) => {
    const result = await logIn({ email, password });
    // onAuthChange will push us to "home" or "entryQuiz" on success.
    return result;
  };

  const handleSignUpSubmit = async ({ name, email, password }) => {
    // set before signUp so onAuthChange ignores auth event.
    isNewSignUp.current = true;
    const result = await signUp({ name, email, password });
    return result;
  };

  const handleResetSubmit = async ({ email }) => resetPassword({ email });

  const handleLogout = async () => {
    await logOut();
    setView("splash");
  };

  // in progress. for results to be saved
  const handleEntryQuizComplete = (results) => {
    /*
    * Note from Anthea
    * need to send results to backend (will setup later)
    */
    setView("home");
  }

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
            <EntryQuiz onComplete={(handleEntryQuizComplete)} />
          </div>
      )

    case "home":
      return <Home user={user} onLogout={handleLogout} />;

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
