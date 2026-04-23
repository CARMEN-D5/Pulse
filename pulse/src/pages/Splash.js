import React from "react";
import "./auth.css";

/**
 * Splash / Welcome page.
 *
 * Maps to the "Start -> Splash Page -> Already a member?" branch of the
 * user flow chart. Offers Login (yes) or Sign Up (no -> sign up).
 */
function Splash({ onLogin, onSignUp }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="pulse-brand">
          <div className="pulse-logo">
            <span className="pulse-logo-dot" aria-hidden="true" />
            Pulse
          </div>
          <p className="pulse-tagline">Balance every beat of your life.</p>
        </div>

        <div className="splash-hero">
          <h1 className="splash-title">Welcome to Pulse</h1>
          <p className="splash-sub">
            Track your spirituality, finance, health, productivity and
            relationships — one gentle check-in at a time.
          </p>
        </div>

        <div className="splash-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onLogin}
          >
            I'm already a member — Log in
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSignUp}
          >
            Create an account
          </button>
        </div>

        <p className="auth-footer">
          By continuing, you agree to Pulse's Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default Splash;
