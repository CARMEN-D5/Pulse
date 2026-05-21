import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { DOMAINS, DOMAIN_KEYS } from '../scoring/scoringEngine';
import { seedDummyWeeklyScores } from '../firestore/seedDummyScores';
import './auth.css';

/* ── Domain config ─────────────────────────────────────────── */
const DOMAIN_META = {
  spirituality:  { icon: 'auto_awesome',    color: '#086a69', label: 'Spirit' },
  relationships: { icon: 'groups',          color: '#4e607f', label: 'Social' },
  productivity:  { icon: 'work',            color: '#5a6550', label: 'Work' },
  health:        { icon: 'favorite',        color: '#c9184a', label: 'Health' },
  finance:       { icon: 'payments',        color: '#983f72', label: 'Finance' },
};

const RANGE_OPTIONS = [
  { label: '4 Weeks',  value: 4 },
  { label: '8 Weeks',  value: 8 },
  { label: '12 Weeks', value: 12 },
];

/* ── Smooth path helper ────────────────────────────────────── */
function smoothPath(points) {
  if (points.length < 2) return '';
  if (points.length === 2)
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.25;
    d += ` C ${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ── SVG Line Chart ────────────────────────────────────────── */
function TrendChart({ data, color }) {
  const W = 360, H = 200;
  const px = 8, pt = 12, pb = 24;
  const cw = W - px * 2, ch = H - pt - pb;

  const pts = useMemo(() => {
    if (!data || !data.length) return [];
    return data.map((v, i) => [
      px + (data.length === 1 ? cw / 2 : (i / (data.length - 1)) * cw),
      pt + ch - (v / 100) * ch,
    ]);
  }, [data, cw, ch]);

  const line = useMemo(() => smoothPath(pts), [pts]);
  const area = useMemo(() => {
    if (!line || !pts.length) return '';
    return `${line} L ${pts[pts.length - 1][0]},${pt + ch} L ${pts[0][0]},${pt + ch} Z`;
  }, [line, pts, ch]);

  if (!data || !data.length) return null;

  return (
    <div className="pa-chart-area">
      {/* Grid lines at 33% and 66% */}
      <div className="pa-chart-gridline" style={{ bottom: '33%' }} />
      <div className="pa-chart-gridline" style={{ bottom: '66%' }} />

      <svg viewBox={`0 0 ${W} ${H}`} className="pa-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill="url(#trendFill)" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y}
            r={i === pts.length - 1 ? 5 : 4}
            fill={i === pts.length - 1 ? color : '#fff'}
            stroke={i === pts.length - 1 ? '#fff' : color}
            strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* Week labels */}
      <div className="pa-chart-labels">
        {data.map((_, i) => {
          if (data.length > 6 && i % 2 !== 0 && i !== data.length - 1) return null;
          return <span key={i}>WEEK {i + 1}</span>;
        })}
      </div>
    </div>
  );
}

/* ── Insight description generator ─────────────────────────── */
function getInsightText(key, diff, score) {
  const r = Math.abs(Math.round(diff));
  if (key === 'health') {
    return diff >= 0
      ? `Your consistency has improved your overall health score by ${r} points. This is your primary growth driver.`
      : `Your health score dipped ${r} points. Consider re-establishing routines to regain momentum.`;
  }
  if (key === 'productivity') {
    return diff >= 0
      ? `Productivity is trending upward with ${r} points of growth. Keep building on task completion streaks.`
      : `Slight dip in work satisfaction identified. Reviewing task loads or environment might be beneficial.`;
  }
  if (key === 'spirituality') {
    return diff >= 0
      ? `Mindfulness practice is paying off with ${r} points improvement. Your spiritual alignment is strengthening.`
      : `Spiritual score declined ${r} points. Try resuming meditation or journaling sessions.`;
  }
  if (key === 'relationships') {
    return diff >= 0
      ? `Social connections are strengthening — up ${r} points. Meaningful relationships continue to deepen.`
      : `Relationship score is down ${r} points. Reach out to someone you care about today.`;
  }
  if (key === 'finance') {
    return diff >= 0
      ? `Financial wellbeing improved ${r} points. Budget tracking and savings habits are working.`
      : `Financial score dropped ${r} points. Review your spending patterns and budget goals.`;
  }
  return `Score changed by ${diff >= 0 ? '+' : ''}${r} points over the selected period.`;
}

/* ── Main Component ───────────────────────────────────────── */
function ProgressAnalytics({ user, onBack }) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(8);
  const [selectedDomain, setSelectedDomain] = useState('overall');
  const [seeding, setSeeding] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  /* Fetch */
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const ref = collection(db, 'users', user.uid, 'weeklyScores');
    getDocs(query(ref, orderBy('weekId', 'desc'), limit(12)))
      .then(snap => {
        const docs = snap.docs.map(d => d.data());
        docs.reverse();
        setWeeklyData(docs);
      })
      .catch(() => setWeeklyData([]))
      .finally(() => setLoading(false));
  }, [user, fetchKey]);

  /* Seed */
  const handleSeed = useCallback(async () => {
    if (!user?.uid || seeding) return;
    setSeeding(true);
    try {
      const r = await seedDummyWeeklyScores(user.uid);
      if (r.ok) setFetchKey(k => k + 1);
    } finally { setSeeding(false); }
  }, [user, seeding]);

  /* Derived data */
  const filtered = useMemo(() => {
    if (weeklyData.length <= range) return weeklyData;
    return weeklyData.slice(weeklyData.length - range);
  }, [weeklyData, range]);

  const chartData = useMemo(() => {
    if (selectedDomain === 'overall')
      return filtered.map(w => Math.round(w.balancedLifeScore ?? 0));
    return filtered.map(w => Math.round(w.domains?.[selectedDomain]?.finalScore ?? 0));
  }, [filtered, selectedDomain]);

  const currentScore = useMemo(() => {
    if (!filtered.length) return 0;
    const last = filtered[filtered.length - 1];
    return Math.round(selectedDomain === 'overall'
      ? (last.balancedLifeScore ?? 0)
      : (last.domains?.[selectedDomain]?.finalScore ?? 0));
  }, [filtered, selectedDomain]);

  const growth = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const fs = selectedDomain === 'overall' ? first.balancedLifeScore ?? 0 : first.domains?.[selectedDomain]?.finalScore ?? 0;
    const ls = selectedDomain === 'overall' ? last.balancedLifeScore ?? 0 : last.domains?.[selectedDomain]?.finalScore ?? 0;
    if (fs === 0) return null;
    return ((ls - fs) / fs * 100).toFixed(1);
  }, [filtered, selectedDomain]);

  const avgGrowthPts = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const fs = selectedDomain === 'overall' ? first.balancedLifeScore ?? 0 : first.domains?.[selectedDomain]?.finalScore ?? 0;
    const ls = selectedDomain === 'overall' ? last.balancedLifeScore ?? 0 : last.domains?.[selectedDomain]?.finalScore ?? 0;
    return ((ls - fs) / (filtered.length - 1)).toFixed(1);
  }, [filtered, selectedDomain]);

  const insights = useMemo(() => {
    if (!filtered.length) return [];
    const last = filtered[filtered.length - 1];
    const first = filtered[0];
    return DOMAIN_KEYS.map(key => {
      const score = Math.round(last.domains?.[key]?.finalScore ?? 0);
      const firstScore = Math.round(first.domains?.[key]?.finalScore ?? 0);
      return { key, score, diff: score - firstScore, ...DOMAIN_META[key] };
    });
  }, [filtered]);

  const chartColor = selectedDomain === 'overall' ? '#086a69' : (DOMAIN_META[selectedDomain]?.color ?? '#086a69');
  const activeLabel = selectedDomain === 'overall' ? 'Overall Balance Score' : DOMAIN_META[selectedDomain]?.label;

  return (
    <div className="pa-shell">
      {/* ── Header ── */}
      <header className="pa-header">
        <button className="pa-back" onClick={onBack} aria-label="Go back">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="pa-header-title">Progress Analytics</h1>
        <button className="pa-seed" onClick={handleSeed} disabled={seeding}
          title="Generate test data">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            {seeding ? 'hourglass_top' : 'science'}
          </span>
        </button>
      </header>

      <main className="pa-main">
        {/* ── Range Toggles ── */}
        <div className="pa-range-wrap">
          <div className="pa-range-bar">
            {RANGE_OPTIONS.map(o => (
              <label key={o.value} className="pa-range-option">
                <input type="radio" name="pa-range" checked={range === o.value}
                  onChange={() => setRange(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="pa-loading">
            <div className="pa-skel pa-skel--hero" />
            <div className="pa-skel pa-skel--chart" />
            <div className="pa-skel pa-skel--insights" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pa-empty">
            <span className="material-symbols-outlined pa-empty-icon">analytics</span>
            <h3>No Weekly Data Yet</h3>
            <p>Complete weekly reflections or tap the flask icon to generate test data.</p>
          </div>
        ) : (
          <>
            {/* ── Overall Score Card (teal gradient) ── */}
            <section className="pa-score-card">
              <div className="pa-score-blur pa-score-blur--tr" />
              <div className="pa-score-blur pa-score-blur--bl" />
              <div className="pa-score-left">
                <h3 className="pa-score-title">{activeLabel}</h3>
                <p className="pa-score-sub">
                  Your {selectedDomain === 'overall' ? 'average across all life domains' : DOMAINS[selectedDomain]?.label + ' domain score'} over the last {range} weeks.
                </p>
              </div>
              <div className="pa-score-pill">
                <div className="pa-score-col">
                  <span className="pa-score-num">{currentScore}</span>
                  <span className="pa-score-label">CURRENT</span>
                </div>
                <div className="pa-score-divider" />
                <div className="pa-score-col">
                  {growth !== null ? (
                    <>
                      <span className="pa-score-growth">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {parseFloat(growth) >= 0 ? 'trending_up' : 'trending_down'}
                        </span>
                        {parseFloat(growth) >= 0 ? '+' : ''}{growth}%
                      </span>
                      <span className="pa-score-label">GROWTH</span>
                    </>
                  ) : (
                    <>
                      <span className="pa-score-growth">—</span>
                      <span className="pa-score-label">GROWTH</span>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* ── Trend Chart Card ── */}
            <section className="pa-section">
              <h3 className="pa-section-title">Detailed Performance Trends</h3>
              <div className="pa-trend-card">
                <div className="pa-trend-top">
                  <div>
                    <span className="pa-trend-label">SELECTED METRIC</span>
                    <h4 className="pa-trend-heading">Balance Score History</h4>
                  </div>
                  {avgGrowthPts !== null && (
                    <div className="pa-trend-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
                      {avgGrowthPts} pts avg.
                    </div>
                  )}
                </div>

                <TrendChart data={chartData} color={chartColor} />

                {/* Domain selector */}
                <div className="pa-domain-row">
                  <button
                    className={`pa-domain-chip ${selectedDomain === 'overall' ? 'pa-domain-chip--active' : ''}`}
                    onClick={() => setSelectedDomain('overall')}
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    <span>Overall</span>
                  </button>
                  {DOMAIN_KEYS.map(key => (
                    <button key={key}
                      className={`pa-domain-chip ${selectedDomain === key ? 'pa-domain-chip--active' : ''}`}
                      onClick={() => setSelectedDomain(key)}
                    >
                      <span className="material-symbols-outlined">{DOMAIN_META[key].icon}</span>
                      <span>{DOMAIN_META[key].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Strategic Insights ── */}
            <section className="pa-section">
              <h3 className="pa-section-title">Strategic Insights</h3>
              <div className="pa-insights">
                {insights.map(ins => {
                  const up = ins.diff >= 0;
                  return (
                    <div key={ins.key} className="pa-insight-card">
                      <div className="pa-insight-corner" style={{ background: `${ins.color}08` }} />
                      <div className="pa-insight-body">
                        <div className="pa-insight-icon" style={{ background: `${ins.color}15`, color: ins.color }}>
                          <span className="material-symbols-outlined">{ins.icon}</span>
                        </div>
                        <div className="pa-insight-content">
                          <h4 className="pa-insight-name">{DOMAINS[ins.key]?.label ?? ins.label}</h4>
                          <p className="pa-insight-text">{getInsightText(ins.key, ins.diff, ins.score)}</p>
                          <div className="pa-insight-bar-wrap">
                            <div className="pa-insight-bar-track">
                              <div className="pa-insight-bar-fill" style={{ width: `${ins.score}%`, background: ins.color }} />
                            </div>
                          </div>
                          <div className="pa-insight-stats">
                            <span>Current: {ins.score}/100</span>
                            <span style={{ color: up ? '#086a69' : '#ac3434' }}>
                              {up ? '+' : ''}{Math.round(ins.diff)} Trend
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default ProgressAnalytics;
