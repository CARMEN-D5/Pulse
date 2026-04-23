import React, { useState } from "react";
import "./auth.css";

/**
 * Sign Up / Registration page.
 *
 * Maps to the "Sign Up? -> Yes -> Complete Registration -> User Logged In"
 * branch. The "Exit Sign Up?" prompt from the flow chart is implemented
 * via the Cancel button which returns to the Splash page.
 *
 * Uses Firebase email/password auth. The display name is stored on the
 * Firebase user via updateProfile (handled in authService).
 */
function SignUp({ onSubmit, onExit, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That doesn't look like a valid email.";
    }
    if (!password) {
      next.password = "Please choose a password.";
    } else if (password.length < 6) {
      // Firebase Auth's default minimum is 6 characters.
      next.password = "Password must be at least 6 characters.";
    }
    if (confirm !== password) {
      next.confirm = "Passwords don't match.";
    }
    return next;
  };

  const handleExit = () => {
    // Flow-chart node: "Exit Sign Up?" -> Yes returns user to Splash.
    if (
      [name, email, password, confirm].some((v) => v.trim?.() !== "")
    ) {
      const ok = window.confirm(
        "Exit sign up? Your details will not be saved."
      );
      if (!ok) return;
    }
    onExit?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = onSubmit
        ? await onSubmit({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : { ok: false, error: "Sign up is not connected to Firebase yet." };

      if (!result?.ok) {
        setServerError(
          result?.error || "Could not complete registration. Please try again."
        );
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

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Start balancing every beat of your life.</p>

        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "invalid" : ""}
              placeholder="Your name"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
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
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? "invalid" : ""}
              placeholder="At least 6 characters"
            />
            {errors.password ? (
              <span className="field-error">{errors.password}</span>
            ) : (
              <span className="field-hint">Use 6+ characters.</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={errors.confirm ? "invalid" : ""}
              placeholder="Retype your password"
            />
            {errors.confirm && (
              <span className="field-error">{errors.confirm}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "Creating account…" : "Complete registration"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <button type="button" className="link-btn" onClick={onSwitchToLogin}>
            Log in
          </button>
        </p>

        <button type="button" className="btn btn-ghost" onClick={handleExit}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SignUp;
