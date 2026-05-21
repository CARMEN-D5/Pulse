import React, { useEffect, useState, useRef } from 'react';
import { DOMAINS, DOMAIN_KEYS } from '../scoring/scoringEngine';
import { computeCurrentScores } from '../firestore/scoring';
import DailyMissions from './DailyMissions';
import './auth.css';

/* ── Domain visual config ──────────────────────────────────── */
const DOMAIN_META = {
  spirituality:  { icon: 'auto_awesome',    gradient: 'linear-gradient(135deg, #086a69 0%, #0a9e9c 100%)', light: '#e6f7f6', text: '#086a69', accent: '#0a9e9c' },
  relationships: { icon: 'groups',           gradient: 'linear-gradient(135deg, #4e607f 0%, #7889a8 100%)', light: '#ebeef4', text: '#4e607f', accent: '#7889a8' },
  productivity:  { icon: 'business_center',  gradient: 'linear-gradient(135deg, #5a6550 0%, #7d8a72 100%)', light: '#eef0eb', text: '#5a6550', accent: '#7d8a72' },
  health:        { icon: 'favorite',         gradient: 'linear-gradient(135deg, #c9184a 0%, #ff4d6d 100%)', light: '#fde8ee', text: '#c9184a', accent: '#ff4d6d' },
  finance:       { icon: 'payments',         gradient: 'linear-gradient(135deg, #983f72 0%, #c06098 100%)', light: '#f5e6ef', text: '#983f72', accent: '#c06098' },
};

const GRID_ORDER = ['spirituality', 'health', 'relationships', 'finance', 'productivity'];

const RADAR_ORDER = ['spirituality', 'relationships', 'finance', 'health', 'productivity'];
const RADAR_LABELS = {
  spirituality:  'Spirit',
  relationships: 'Family',
  finance:       'Finance',
  health:        'Health',
  productivity:  'Work',
};

const FOCUS_SUGGESTIONS = {
  spirituality:  { title: 'Focus on Mindfulness',    text: 'Boost mental clarity with a 10-minute meditation session.',     icon: 'self_improvement' },
  relationships: { title: 'Strengthen Connections',   text: 'Reach out to someone you care about today.',                   icon: 'diversity_1' },
  productivity:  { title: 'Boost Productivity',       text: 'Complete one important task to build momentum.',               icon: 'target' },
  health:        { title: 'Prioritize Health',        text: 'Take a short walk or stretch session to energize.',            icon: 'directions_walk' },
  finance:       { title: 'Review Finances',          text: 'Log your expenses and review your budget today.',              icon: 'account_balance' },
};

function getStatusLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Developing';
  return 'Needs Focus';
}

function getScoreLabel(score) {
  if (score >= 85) return 'Thriving';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Building';
  return 'Focus';
}

function getStatusColor(score) {
  if (score >= 80) return '#2f9e7a';
  if (score >= 60) return '#086a69';
  if (score >= 40) return '#d4a017';
  return '#c9184a';
}

/* ── Radar geometry ────────────────────────────────────────── */
const CX = 60, CY = 56, MAX_R = 38;

function radarPt(i, pct) {
  const a = (2 * Math.PI * i / 5) - Math.PI / 2;
  const r = MAX_R * pct / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function labelPt(i) {
  const a = (2 * Math.PI * i / 5) - Math.PI / 2;
  const r = MAX_R + 12;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

/* ── Radar Chart ───────────────────────────────────────────── */
function RadarChart({ domainScores }) {
  const pts = RADAR_ORDER.map((k, i) => radarPt(i, domainScores[k] ?? 0));
  const poly = pts.map(p => p.join(',')).join(' ');

  /* Grid rings at 25/50/75/100 */
  const gridRings = [25, 50, 75, 100];

  return (
    <svg className="dash-radar-svg" viewBox="0 0 120 112">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c9184a" stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {gridRings.map(pct => {
        const ringPts = RADAR_ORDER.map((_, i) => radarPt(i, pct));
        return (
          <polygon key={pct}
            points={ringPts.map(p => p.join(',')).join(' ')}
            fill="none" stroke="#eadfe3" strokeWidth="0.3" />
        );
      })}

      {/* Axis lines */}
      {RADAR_ORDER.map((_, i) => {
        const [x, y] = radarPt(i, 100);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#eadfe3" strokeWidth="0.3" />;
      })}

      {/* Data polygon */}
      <polygon points={poly}
        fill="url(#radarFill)" stroke="#c9184a" strokeWidth="0.8"
        strokeLinejoin="round" className="dash-radar-polygon" />

      {/* Data dots */}
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="2.2" fill="#fff" stroke="#c9184a" strokeWidth="0.8" />
          <circle cx={x} cy={y} r="1" fill="#c9184a" />
        </g>
      ))}

      {/* Labels + scores */}
      {RADAR_ORDER.map((key, i) => {
        const [x, y] = labelPt(i);
        const anchor = x < 50 ? 'end' : x > 70 ? 'start' : 'middle';
        const score = Math.round(domainScores[key] ?? 0);
        return (
          <g key={key}>
            <text x={x} y={y - 1.5} textAnchor={anchor}
              fill="#1f1f2e" fontSize="3.8" fontWeight="700"
              fontFamily="'Manrope', sans-serif">
              {RADAR_LABELS[key]}
            </text>
            <text x={x} y={y + 3.2} textAnchor={anchor}
              fill="#6b6b7a" fontSize="3.2" fontWeight="600"
              fontFamily="'Manrope', sans-serif">
              {score}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Mini progress bar ─────────────────────────────────────── */
function MiniBar({ value, color }) {
  return (
    <div className="dash-minibar">
      <div className="dash-minibar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

/* ── Home / Dashboard ──────────────────────────────────────── */
function Home({
  user, userDoc, scoreVersion,
  onDomainSelect, onOpenDomain, onNevigate,
  onLogout, onOpenProgress,
}) {
  const [scores, setScores] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const heroRef = useRef(null);

  const openDomain = onDomainSelect || onOpenDomain || onNevigate || (() => {});

  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'there';

  const firstName = displayName.split(' ')[0];
  const initials = (displayName.charAt(0) || '?').toUpperCase();

  useEffect(() => {
    if (!user?.uid || !userDoc) return;
    setScoresLoading(true);
    computeCurrentScores(user.uid, userDoc)
      .then(result => {
        setScores(result);
        setTimeout(() => setAnimate(true), 100);
      })
      .finally(() => setScoresLoading(false));
  }, [user?.uid, userDoc, scoreVersion]);

  const balanceScore = scores ? Math.round(scores.balancedLifeScore) : 0;

  const focusDomainKey = scores
    ? DOMAIN_KEYS.reduce((low, key) =>
        (scores.domainScores[key] < scores.domainScores[low]) ? key : low)
    : 'spirituality';
  const focusSuggestion = FOCUS_SUGGESTIONS[focusDomainKey];
  const focusMeta = DOMAIN_META[focusDomainKey];

  const ringR = 78;
  const ringCirc = 2 * Math.PI * ringR;
  const ringOffset = animate ? ringCirc * (1 - balanceScore / 100) : ringCirc;

  /* Time-aware greeting */
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="dash-shell">

      {/* ── Header ──────────────────────────────────── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-greeting-block">
            <span className="dash-greeting-sub">{timeGreeting}</span>
            <span className="dash-greeting-name">{firstName}</span>
          </div>
        </div>
        <button type="button" className="dash-header-btn" onClick={onLogout} aria-label="Log out">
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="dash-main">
        {scoresLoading ? (
          <section className="dash-hero">
            <div className="dash-skeleton-ring" />
            <p className="dash-loading">Calculating your balance…</p>
          </section>
        ) : scores ? (
          <>
            {/* ── Hero Score Ring ─────────────────────── */}
            <section className="dash-hero" ref={heroRef}>
              <div className="dash-ring-wrap">
                <svg className="dash-ring-svg" viewBox="0 0 180 180">
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c9184a" />
                      <stop offset="50%" stopColor="#ff4d6d" />
                      <stop offset="100%" stopColor="#ff8fa3" />
                    </linearGradient>
                  </defs>
                  {/* Track */}
                  <circle cx="90" cy="90" r={ringR}
                    fill="none" stroke="#f0e0e5" strokeWidth="7" />
                  {/* Progress */}
                  <circle cx="90" cy="90" r={ringR}
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 90 90)"
                    className="dash-ring-fill" />
                </svg>
                <div className="dash-ring-center">
                  <span className="dash-ring-num">{balanceScore}</span>
                  <span className="dash-ring-label">Life Balance</span>
                </div>
              </div>
              <div className="dash-status-badge" style={{ color: getStatusColor(balanceScore) }}>
                <span className="dash-status-dot" style={{ background: getStatusColor(balanceScore) }} />
                {getStatusLabel(balanceScore)}
              </div>
            </section>

            {/* ── Radar Card ─────────────────────────── */}
            <section className="dash-card">
              <div className="dash-card-header">
                <span className="material-symbols-outlined dash-card-icon">donut_small</span>
                <h2 className="dash-card-title">Life Overview</h2>
              </div>
              <div className="dash-radar-wrap">
                <RadarChart domainScores={scores.domainScores} />
              </div>
            </section>

            {/* ── Progress Analytics Link ────────────── */}
            {onOpenProgress && (
              <button type="button" className="dash-progress-btn" onClick={onOpenProgress}>
                <span className="material-symbols-outlined dash-progress-icon">insights</span>
                <div className="dash-progress-text">
                  <span className="dash-progress-label">Progress Analytics</span>
                  <span className="dash-progress-sub">View your trends &amp; insights</span>
                </div>
                <span className="material-symbols-outlined dash-progress-arrow">chevron_right</span>
              </button>
            )}

            {/* ── Domain Cards ───────────────────────── */}
            <section className="dash-card">
              <div className="dash-card-header">
                <span className="material-symbols-outlined dash-card-icon">grid_view</span>
                <h2 className="dash-card-title">Your Domains</h2>
              </div>
              <div className="dash-domain-list">
                {GRID_ORDER.map((key) => {
                  const score = Math.round(scores.domainScores[key] ?? 0);
                  const meta = DOMAIN_META[key];
                  return (
                    <button key={key} type="button" className="dash-domain-row"
                      onClick={() => openDomain(key)}>
                      <div className="dash-domain-icon-circle" style={{ background: meta.gradient }}>
                        <span className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1", fontSize: 18 }}>
                          {meta.icon}
                        </span>
                      </div>
                      <div className="dash-domain-detail">
                        <div className="dash-domain-top-row">
                          <span className="dash-domain-name">{DOMAINS[key].label}</span>
                          <span className="dash-domain-score" style={{ color: meta.text }}>{score}</span>
                        </div>
                        <MiniBar value={score} color={meta.accent} />
                        <span className="dash-domain-badge" style={{ color: meta.text }}>
                          {getScoreLabel(score)}
                        </span>
                      </div>
                      <span className="material-symbols-outlined dash-domain-arrow">chevron_right</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Daily Missions ─────────────────────── */}
            <DailyMissions
              user={user}
              domainScores={scores.domainScores}
            />

            {/* ── Focus Banner ───────────────────────── */}
            <section className="dash-focus" onClick={() => openDomain(focusDomainKey)}>
              <div className="dash-focus-accent" style={{ background: focusMeta.gradient }} />
              <div className="dash-focus-body">
                <div className="dash-focus-icon-wrap" style={{ background: focusMeta.gradient }}>
                  <span className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {focusSuggestion.icon}
                  </span>
                </div>
                <div className="dash-focus-text-block">
                  <span className="dash-focus-tag">Suggested Focus</span>
                  <h3 className="dash-focus-title">{focusSuggestion.title}</h3>
                  <p className="dash-focus-text">{focusSuggestion.text}</p>
                </div>
                <span className="material-symbols-outlined dash-focus-go">arrow_forward</span>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}


export default Home;
