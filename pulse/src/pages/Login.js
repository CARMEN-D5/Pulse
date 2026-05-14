import React, { useState } from "react";
import "./auth.css";

function Login({ onSubmit, onForgotPassword, onBack, onSwitchToSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-redesign auth-redesign--signin">
      {/* Decorative blurs */}
      <div className="auth-redesign-decor auth-redesign-decor--1" />
      <div className="auth-redesign-decor auth-redesign-decor--2" />

      <main className="auth-redesign-main">
        {/* Header */}
        <header className="auth-redesign-header">
          <div className="auth-redesign-icon-box">
            <span className="material-symbols-outlined">self_care</span>
          </div>
          <h1 className="auth-redesign-title">Sign In</h1>
          <p className="auth-redesign-sub">Welcome back to Pulse</p>
        </header>

        {/* Form card */}
        <section className="auth-glass-card">
          {loginError && (
            <div className="auth-glass-alert" role="alert">
              {loginError}
            </div>
          )}

          <form className="auth-glass-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="auth-glass-field">
              <label className="auth-glass-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="auth-glass-input-wrap">
                <span className="material-symbols-outlined auth-glass-input-icon">
                  email
                </span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`auth-glass-input auth-glass-input--rounded${errors.email ? " invalid" : ""}`}
                  placeholder="yourname@email.com"
                />
              </div>
              {errors.email && (
                <span className="auth-glass-field-error">{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="auth-glass-field">
              <label className="auth-glass-label" htmlFor="login-password">
                Password
              </label>
              <div className="auth-glass-input-wrap">
                <span className="material-symbols-outlined auth-glass-input-icon">
                  lock
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`auth-glass-input auth-glass-input--rounded auth-glass-input--has-toggle${errors.password ? " invalid" : ""}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-glass-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <span className="auth-glass-field-error">{errors.password}</span>
              )}
              <div className="auth-glass-forgot-row">
                <button
                  type="button"
                  className="auth-glass-forgot"
                  onClick={onForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-glass-cta auth-glass-cta--rounded"
              disabled={submitting}
            >
              <span>{submitting ? "Signing in…" : "Sign In"}</span>
              {!submitting && (
                <span className="material-symbols-outlined">arrow_forward</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-glass-divider">
            <div className="auth-glass-divider-line" />
            <span className="auth-glass-divider-text">OR</span>
            <div className="auth-glass-divider-line" />
          </div>

          {/* Social login (circular) */}
          <div className="auth-glass-socials--circles">
            <button
              type="button"
              className="auth-glass-social-circle"
              onClick={() => alert("Google sign-in coming soon")}
              aria-label="Sign in with Google"
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button
              type="button"
              className="auth-glass-social-circle"
              onClick={() => alert("Apple sign-in coming soon")}
              aria-label="Sign in with Apple"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                smartphone
              </span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="auth-redesign-footer">
          Don't have an account?
          <button
            type="button"
            className="auth-redesign-footer-link"
            onClick={onSwitchToSignUp}
          >
            Sign Up
          </button>
        </footer>
      </main>
    </div>
  );
}

export default Login;
