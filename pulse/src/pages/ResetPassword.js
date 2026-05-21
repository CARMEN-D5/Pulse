import React, { useState } from "react";
import "./auth.css";

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
    <div className="auth-redesign auth-redesign--signin">
      <div className="auth-redesign-decor auth-redesign-decor--1" />
      <div className="auth-redesign-decor auth-redesign-decor--2" />

      <main className="auth-redesign-main">
        {/* Header */}
        <header className="auth-redesign-header">
          <div className="auth-redesign-icon-box">
            <span className="material-symbols-outlined">lock_reset</span>
          </div>
          <h1 className="auth-redesign-title">Reset Password</h1>
          <p className="auth-redesign-sub">
            Enter your email and we'll send you a reset link
          </p>
        </header>

        {/* Card */}
        <section className="auth-glass-card">
          {sent ? (
            <div className="auth-glass-form">
              <div className="auth-glass-success" role="status">
                <span className="material-symbols-outlined auth-glass-success-icon">
                  check_circle
                </span>
                <p className="auth-glass-success-text">
                  If an account exists for <strong>{email}</strong>, a password
                  reset link has been sent.
                </p>
              </div>
              <button
                type="button"
                className="auth-glass-cta auth-glass-cta--rounded"
                onClick={onBackToLogin}
              >
                <span>Back to Sign In</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          ) : (
            <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="auth-glass-alert" role="alert">
                  {error}
                </div>
              )}

              <div className="auth-glass-field">
                <label className="auth-glass-label" htmlFor="reset-email">
                  Email Address
                </label>
                <div className="auth-glass-input-wrap">
                  <span className="material-symbols-outlined auth-glass-input-icon">
                    email
                  </span>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`auth-glass-input auth-glass-input--rounded${error ? " invalid" : ""}`}
                    placeholder="yourname@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-glass-cta auth-glass-cta--rounded"
                disabled={submitting}
              >
                <span>{submitting ? "Sending…" : "Send Reset Link"}</span>
                {!submitting && (
                  <span className="material-symbols-outlined">arrow_forward</span>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="auth-redesign-footer">
          <button
            type="button"
            className="auth-redesign-footer-link"
            onClick={onBackToLogin}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>
              arrow_back
            </span>
            Back to Sign In
          </button>
        </footer>
      </main>
    </div>
  );
}

export default ResetPassword;
