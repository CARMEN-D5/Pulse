import React, { useState } from "react";
import "./auth.css";

/**
 * Login page.
 *
 * Maps to the "Enter username/email and password" -> "Valid user credentials?"
 * branch of the user-flow chart. Firebase email/password auth is email-only
 * (usernames would require a Firestore lookup layer), so this page collects
 * an email.
 *
 * On failure, shows the "Login Failed" state and exposes a "Forgot
 * password?" link which routes to Reset Password.
 */
function Login({ onSubmit, onForgotPassword, onBack, onSwitchToSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!email.trim()) {
      next.email = "Enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That doesn't look like a valid email.";
    }
    if (!password) next.password = "Enter your password.";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setLoginError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Parent wires this up to Firebase Auth and returns
      // { ok, error? } so we can branch on the flow chart's
      // "Valid user credentials?" decision.
      const result = onSubmit
        ? await onSubmit({ email: email.trim(), password })
        : { ok: false, error: "Auth is not wired up." };

      if (!result?.ok) {
        setLoginError(result?.error || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="pulse-brand">
          <div className="pulse-logo">
            <span className="pulse-logo-dot" aria-hidden="true" />
            Pulse
          </div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Log in to keep your streak going.</p>

        {loginError && (
          <div className="alert alert-error" role="alert">
            {loginError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? "invalid" : ""}
              placeholder="you@example.com"
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? "invalid" : ""}
              placeholder="••••••••"
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          <div className="auth-row">
            <button
              type="button"
              className="link-btn"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-footer">
          New to Pulse?{" "}
          <button type="button" className="link-btn" onClick={onSwitchToSignUp}>
            Create an account
          </button>
        </p>

        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

export default Login;
