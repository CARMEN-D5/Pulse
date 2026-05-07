import React, { useEffect, useState } from "react";
import "./App.css";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import TodoList from "./pages/TodoList";
import Finance from "./pages/Finance";

import {
  signUp,
  logIn,
  logOut,
  resetPassword,
  onAuthChange,
} from "./auth/authService";
import { ensureUserDoc } from "./firestore/users";

/**
 * Top-level view state for Pulse.
 *
 * Flow (mirrors the user-flow chart):
 *   splash     -> entry / "Already a member?"
 *   login      -> "Enter username/email and password"
 *   signup     -> "Complete Registration"
 *   reset      -> "Reset Password"
 *   home       -> "User Logged In -> Home Page"
 *   finance    -> Finance / budget-tracker domain
 *   todo       -> To-do list (productivity domain)
 *
 * Auth is provided by Firebase (see src/firebase.js + src/auth/authService.js).
 * `onAuthChange` keeps the view in sync with Firebase's persisted session, so
 * a returning user is taken straight to Home on refresh.
 */
function App() {
  const [view, setView] = useState("splash");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Subscribe to Firebase auth state. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      // Backfill / touch the users/{uid} doc whenever someone's logged in.
      // Fire-and-forget — don't block UI on Firestore.
      if (firebaseUser) ensureUserDoc(firebaseUser);
      // Auto-route: logged-in users land on home (unless they've already
      // navigated deeper — keep them on finance / todo / etc). Logged-out
      // users bounce out of any authed view back to splash.
      const AUTHED_VIEWS = ["home", "finance", "todo"];
      setView((current) => {
        if (firebaseUser) {
          return AUTHED_VIEWS.includes(current) ? current : "home";
        }
        return AUTHED_VIEWS.includes(current) ? "splash" : current;
      });
    });
    return unsubscribe;
  }, []);

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

    case "home":
      return (
        <Home
          user={user}
          onLogout={handleLogout}
          // Single nav callback. `destination` is one of the domain keys
          // ("productivity", "finance", "spirituality", …) or a real view
          // id like "todo". Built domains route to their view; the rest
          // get a "coming soon" alert.
          onNevigate={(destination) => {
            const REAL_VIEWS = ["finance", "todo"];
            if (REAL_VIEWS.includes(destination)) {
              setView(destination);
              return;
            }
            window.alert(
              `${destination[0].toUpperCase() + destination.slice(1)} is coming in a future sprint.`
            );
          }}
        />
      );

    case "todo":
      return <TodoList user={user} onBack={() => setView("home")} />;

    case "finance":
      return <Finance user={user} onBack={() => setView("home")} />;

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
