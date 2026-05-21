import React, { useEffect, useState } from 'react';
import { DOMAINS, DOMAIN_KEYS } from '../scoring/scoringEngine';
import { computeCurrentScores } from '../firestore/scoring';
import DailyMissions from './DailyMissions';
import './auth.css';

function ScoreRing({ score }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * (Math.min(100, Math.max(0, score)) / 100);

  return (
    <svg className="score-ring" viewBox="0 0 128 128" aria-hidden="true">
      <circle cx="64" cy="64" r={r} className="score-ring-track" />
      <circle
        cx="64" cy="64" r={r}
        className="score-ring-fill"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset="0"
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="60" className="score-ring-num" textAnchor="middle" dominantBaseline="middle">
        {Math.round(score)}
      </text>
      <text x="64" y="80" className="score-ring-label" textAnchor="middle">
        / 100
      </text>
    </svg>
  );
}

function DomainBar({ domainKey, score }) {
  const domain = DOMAINS[domainKey];
  const pct = Math.round(Math.min(100, Math.max(0, score)));
  const color = pct >= 70 ? '#2f9e7a' : pct >= 40 ? '#ff8fa3' : '#d64545';

  return (
    <div className="domain-bar">
      <div className="domain-bar-header">
        <span className="domain-bar-icon" aria-hidden="true">{domain.icon}</span>
        <span className="domain-bar-name">{domain.label}</span>
        <span className="domain-bar-score" style={{ color }}>{pct}</span>
      </div>
      <div className="domain-bar-track">
        <div
          className="domain-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Home({
  user,
  userDoc,
  scoreVersion,
  onDomainSelect,
  onOpenDomain,
  onNevigate,        // legacy callback name from to-do-list / entry-quiz branches
  onLogout,
}) {
  const [scores, setScores] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(true);

  // Accept any of the three callback names so this Home page stays compatible
  // with parents written for the scoring branch, the Finance-BudgetTracker
  // branch, or the to-do-list / entry-quiz branches.
  const openDomain = onDomainSelect || onOpenDomain || onNevigate || ((id) => {
    window.alert(`${id} screen is coming in a future sprint.`);
  });

  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'there';

  // Re-fetch scores when scoreVersion increments (i.e. after logging an activity)
  useEffect(() => {
    if (!user?.uid || !userDoc) return;
    setScoresLoading(true);
    computeCurrentScores(user.uid, userDoc)
      .then(result => setScores(result))
      .finally(() => setScoresLoading(false));
  }, [user?.uid, userDoc, scoreVersion]);

  return (
    <div className="home-shell">
      <div className="home-container">

        {/* Header */}
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
            style={{ width: 'auto' }}
            onClick={onLogout}
          >
            Log out
          </button>
        </div>

        {/* Balanced Life Score */}
        {scoresLoading ? (
          <div className="score-card score-card--loading">
            <p>Calculating your balance score…</p>
          </div>
        ) : scores ? (
          <div className="score-card">
            <div className="score-card-ring">
              <ScoreRing score={scores.balancedLifeScore} />
              <div className="score-card-meta">
                <p className="score-card-title">Balanced Life Score</p>
                <p className="score-card-sub">
                  Life Strength&nbsp;
                  <strong>{Math.round(scores.lifeStrength)}</strong>
                  &nbsp;·&nbsp;
                  Evenness&nbsp;
                  <strong>{Math.round(scores.evenness)}</strong>
                </p>
              </div>
            </div>

            <div className="domain-bars">
              {DOMAIN_KEYS.map(key => (
                <DomainBar key={key} domainKey={key} score={scores.domainScores[key]} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Domain tiles */}
        <div className="domain-grid">
          {DOMAIN_KEYS.map(key => {
            const d = DOMAINS[key];
            const score = scores?.domainScores?.[key];
            return (
              <button
                key={key}
                type="button"
                className="domain-card"
                onClick={() => openDomain(key)}
              >
                <div className="domain-icon" aria-hidden="true">{d.icon}</div>
                <p className="domain-name">{d.label}</p>
                {score != null && (
                  <p className="domain-card-score">{Math.round(score)}</p>
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="domain-card"
            onClick={() => window.alert('Profile screen is coming in a future sprint.')}
          >
            <div className="domain-icon" aria-hidden="true">👤</div>
            <p className="domain-name">Profile</p>
            <p className="domain-desc">Your settings and balance score.</p>
          </button>
        </div>

        {/* ── Daily Missions (shown once scores are ready) ── */}
        {!scoresLoading && scores && (
            <DailyMissions
                user={user}
                domainScores={scores.domainScores}
            />
        )}

      </div>
    </div>
  );
}


export default Home;
