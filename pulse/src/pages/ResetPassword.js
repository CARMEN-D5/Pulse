import React, { useState } from "react";
import "./auth.css";

/**
 * Reset Password page.
 *
 * Maps to the "Forgot Password? -> Yes -> Reset Password" node of the
 * user flow chart. After submission the user is routed back to the Login
 * screen to enter their (new) credentials.
 */
function ResetPassword({ onSubmit, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter the email on your account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That doesn't look like a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const result = onSubmit
        ? await onSubmit({ email: email.trim() })
        : { ok: true };
      if (result?.ok) {
        setSent(true);
      } else {
        setError(
          result?.error || "We couldn't send a reset link. Please try again."
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

        <h2 className="auth-title">Reset your password</h2>
        <p className="auth-subtitle">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <>
            <div className="alert alert-success" role="status">
              If an account exists for <strong>{email}</strong>, a password
              reset link has been sent.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onBackToLogin}
            >
              Back to login
            </button>
          </>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "invalid" : ""}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={onBackToLogin}
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
