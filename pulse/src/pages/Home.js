import React, { useState } from "react";
import "./auth.css";

/**
 * Home page shown after a successful login / registration.
 *
 * Renders the 5 domains of life (Spirituality, Finance, Health,
 * Productivity, Relationships) plus Profile as cards. Each card calls
 * back to the parent via `onNevigate(destination)`; the parent decides
 * which destination is a real view and which still pops a "coming soon"
 * message.
 *
 * Productivity is mapped to the to-do list (the first feature delivered
 * for that domain), Finance is mapped to its own screen.
 */
const DOMAINS = [
  {
    key: "spirituality",
    name: "Spirituality",
    icon: "🕊️",
    desc: "Reflect, journal and explore what matters to you.",
  },
  {
    key: "finance",
    name: "Finance",
    icon: "💰",
    desc: "Track budgets, goals and everyday spending.",
  },
  {
    key: "health",
    name: "Health",
    icon: "💪",
    desc: "Log activity, sleep, mood and diet.",
  },
  {
    key: "productivity",
    name: "Productivity",
    icon: "📚",
    desc: "Study sessions, chores, and weekly missions.",
  },
  {
    key: "relationships",
    name: "Relationships",
    icon: "🤝",
    desc: "Stay in touch with friends and family.",
  },
  {
    key: "profile",
    name: "Profile",
    icon: "👤",
    desc: "Your settings, streaks and balance score.",
  },
];

function Home({ user, onLogout, onNevigate }) {
  // Firebase user exposes `displayName` and `email`; fall back gracefully so
  // the stubbed/test paths still render a friendly greeting.
  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "there";

  // Productivity card → to-do list view. Everything else passes its own
  // key through to the parent, which will alert for any unbuilt domain.
  const handleDomainClick = (key) => {
    if (!onNevigate) return;
    onNevigate(key === "productivity" ? "todo" : key);
  };

  return (
    <div className="home-shell">
      <div className="home-container">
        <div className="home-header">
          <div className="home-welcome">
            <div className="pulse-logo" style={{ fontSize: 20 }}>
              <span className="pulse-logo-dot" aria-hidden="true" />
              Pulse
            </div>
            <h1>Hi, {displayName} 👋</h1>
            <p>Here's your balance across the 5 domains of life.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "auto" }}
            onClick={onLogout}
          >
            Log out
          </button>
        </div>

        <div className="domain-grid">
          {DOMAINS.map((d) => (
            <button
              key={d.key}
              type="button"
              className="domain-card"
              onClick={() => handleDomainClick(d.key)}
            >
              <div className="domain-icon" aria-hidden="true">
                {d.icon}
              </div>
              <p className="domain-name">{d.name}</p>
              <p className="domain-desc">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
