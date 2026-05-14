import React from "react";
import "./auth.css";

function Splash({ onLogin, onSignUp }) {
  return (
    <div className="welcome-shell">
      <header className="welcome-header">
        <div className="welcome-brand">
          <span className="material-symbols-outlined welcome-brand-icon">spa</span>
          <span className="welcome-brand-name">Pulse</span>
        </div>
      </header>

      <main className="welcome-main">
        {/* Hero visual */}
        <div className="welcome-hero-wrap">
          <div className="welcome-hero-glow" />
          <div className="welcome-hero-card">
            <span className="material-symbols-outlined welcome-hero-icon">
              self_improvement
            </span>
            <div className="welcome-hero-sub-icons">
              <span className="material-symbols-outlined">favorite</span>
              <span className="material-symbols-outlined">psychology</span>
              <span className="material-symbols-outlined">groups</span>
              <span className="material-symbols-outlined">work</span>
            </div>
          </div>
          {/* Floating reflection card */}
          <div className="welcome-reflect-card">
            <div className="welcome-reflect-header">
              <span className="material-symbols-outlined">lightbulb</span>
              <span className="welcome-reflect-label">Reflection</span>
            </div>
            <p className="welcome-reflect-text">
              What part of your life needs the most care today?
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="welcome-content">
          <h1 className="welcome-title">
            Find Your Perfect{" "}
            <span className="welcome-title-accent">Balance</span>
          </h1>
          <p className="welcome-subtitle">
            Discover a more intentional way to live across all domains of your
            life: Health, Mind, Spirit, Social, and Work.
          </p>
        </div>

        {/* Actions */}
        <div className="welcome-actions">
          <button type="button" className="welcome-cta" onClick={onSignUp}>
            <div className="welcome-cta-shine" />
            <span className="welcome-cta-inner">
              Start My Journey
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>
          <button
            type="button"
            className="welcome-login-link"
            onClick={onLogin}
          >
            I already have an account
          </button>
        </div>
      </main>

      {/* Domain indicators (desktop only) */}
      <div className="welcome-domains">
        <div className="welcome-domain-item">
          <span className="material-symbols-outlined">favorite</span>
          <span className="welcome-domain-label">Health</span>
        </div>
        <div className="welcome-domain-item">
          <span className="material-symbols-outlined">psychology</span>
          <span className="welcome-domain-label">Mind</span>
        </div>
        <div className="welcome-domain-item">
          <span className="material-symbols-outlined">self_improvement</span>
          <span className="welcome-domain-label">Spirit</span>
        </div>
        <div className="welcome-domain-item">
          <span className="material-symbols-outlined">groups</span>
          <span className="welcome-domain-label">Social</span>
        </div>
        <div className="welcome-domain-item">
          <span className="material-symbols-outlined">work</span>
          <span className="welcome-domain-label">Work</span>
        </div>
      </div>
    </div>
  );
}

export default Splash;
