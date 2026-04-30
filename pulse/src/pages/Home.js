import React from "react";
import "./auth.css";

/**
 * Placeholder Home page shown after a successful login / registration.
 *
 * This is intentionally light — it exists so the login branch has a clear
 * "User Logged In -> Home Page" destination that matches the user-flow
 * chart's 5 domains plus Profile. The actual domain screens are owned by
 * other sprints / branches.
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
              onClick={() => {
                  if (d.key === "productivity"){
                    onNevigate("todo");
                  }else{
                     openDomain(d.key)}
            }}
            >
              <div className="domain-icon" aria-hidden="true">
                {d.icon}
              </div>
              <p className="domain-name">{d.name}</p>
              <p className="domain-desc">{d.desc}</p>
            </button>
          ))}
        {/*</div>*/}

        {/*/!*<div className="home-footer" style={{ marginTop: '2rem', textAlign: 'center'}}>*!/*/}
        {/*/!*  <button*!/*/}
        {/*/!*    type="button"*!/*/}
        {/*/!*    className="btn btn-primary"*!/*/}
        {/*/!*    style={{ padding: '12px 24px', fontSize: '1.1rem'}}*!/*/}
        {/*/!*    onClick={() => onNevigate("todo")}>*!/*/}
        {/*/!*    📋 Open My To-Do List*!/*/}
        {/*/!*  </button>*!/*/}
        </div>
      </div>
    </div>
  );
}

export default Home;
