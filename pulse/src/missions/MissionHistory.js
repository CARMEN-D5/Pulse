/**
 * Full-screen history view with three tabs:
 *
 *   Tab 1 – This Week      : daily breakdown for the current ISO week
 *   Tab 2 – By Domain      : per-domain completion % across all history
 *   Tab 3 – All Time       : every past day, overall completion %, domain split
 *
 * Props:
 *   user    Firebase user object
 *   onBack  callback → returns to DailyMissions
 */

import React, { useEffect, useState } from 'react';
import { DOMAIN_META, ALL_DOMAINS } from './missionPools';
import { loadHistory, getDayKey, getWeekKey } from './missionEngine';
import './MissionHistory.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short day label: "Mon 12 May" */
function formatDay(dayKey) {
    const d = new Date(dayKey + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Aggregate domain stats from a list of history records. */
function aggregateDomains(records) {
    const stats = {};
    ALL_DOMAINS.forEach(k => { stats[k] = { total: 0, completed: 0 }; });

    for (const rec of records) {
        for (const m of rec.missions ?? []) {
            if (!stats[m.domain]) stats[m.domain] = { total: 0, completed: 0 };
            stats[m.domain].total     += 1;
            stats[m.domain].completed += m.completed ? 1 : 0;
        }
    }
    return stats;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PctBar({ pct, color }) {
    return (
        <div className="mh-pct-track">
            <div
                className="mh-pct-fill"
                style={{ width: `${pct}%`, background: color }}
            />
        </div>
    );
}

/** One day row used in This Week and All Time tabs. */
function DayRow({ record }) {
    const [open, setOpen] = useState(false);
    const total     = record.missions?.length ?? 0;
    const completed = record.missions?.filter(m => m.completed).length ?? 0;
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
    const allDone   = completed === total;

    return (
        <div className="mh-day-row">
            <button
                type="button"
                className="mh-day-header"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <div className="mh-day-left">
                    <span className="mh-day-label">{formatDay(record.dayKey)}</span>
                    <span className={`mh-day-badge ${allDone ? 'mh-day-badge--done' : ''}`}>
            {completed}/{total}
          </span>
                </div>
                <div className="mh-day-right">
          <span className="mh-day-pct" style={{ color: allDone ? '#2f9e7a' : '#c9184a' }}>
            {pct}%
          </span>
                    <span className="mh-chevron">{open ? '▲' : '▼'}</span>
                </div>
            </button>

            {open && (
                <ul className="mh-mission-list">
                    {(record.missions ?? []).map((m, i) => {
                        const meta = DOMAIN_META[m.domain] ?? { label: m.domain, icon: '⭐', color: '#888' };
                        return (
                            <li key={i} className={`mh-mission-item ${m.completed ? 'mh-mission-item--done' : ''}`}>
                <span
                    className="mh-mission-dot"
                    style={{ background: m.completed ? meta.color : '#ddd' }}
                />
                                <div className="mh-mission-body">
                                    <p className="mh-mission-text">{m.text}</p>
                                    <span className="mh-mission-domain" style={{ color: meta.color }}>
                    {meta.icon} {meta.label}
                  </span>
                                </div>
                                <span className={`mh-mission-status ${m.completed ? 'mh-mission-status--done' : ''}`}>
                  {m.completed ? '✓ Done' : '✗ Missed'}
                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ─── Tab 1: This Week ─────────────────────────────────────────────────────────

function TabThisWeek({ history }) {
    const thisWeek   = getWeekKey();
    const weekRecs   = history.filter(r => r.weekKey === thisWeek);
    const total      = weekRecs.reduce((s, r) => s + (r.missions?.length ?? 0), 0);
    const completed  = weekRecs.reduce((s, r) => s + (r.missions?.filter(m => m.completed).length ?? 0), 0);
    const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (weekRecs.length === 0) {
        return (
            <div className="mh-empty">
                <p>No mission history yet for this week.</p>
                <p className="mh-empty-sub">Complete today's missions and come back tomorrow!</p>
            </div>
        );
    }

    return (
        <div className="mh-tab-content">
            {/* Week summary */}
            <div className="mh-week-summary">
                <div className="mh-summary-row">
                    <span className="mh-summary-label">This week's completion</span>
                    <span className="mh-summary-pct" style={{ color: pct >= 70 ? '#2f9e7a' : '#c9184a' }}>
            {pct}%
          </span>
                </div>
                <PctBar pct={pct} color={pct >= 70 ? '#2f9e7a' : '#c9184a'} />
                <p className="mh-summary-sub">{completed} of {total} missions completed</p>
            </div>

            {/* Daily breakdown */}
            <div className="mh-section-title">Daily Breakdown</div>
            {weekRecs.map(rec => (
                <DayRow key={rec.dayKey} record={rec} />
            ))}
        </div>
    );
}

// ─── Tab 2: By Domain ─────────────────────────────────────────────────────────

function TabByDomain({ history }) {
    const stats = aggregateDomains(history);
    const totalMissions = Object.values(stats).reduce((s, v) => s + v.total, 0);

    if (totalMissions === 0) {
        return (
            <div className="mh-empty">
                <p>No mission history yet.</p>
                <p className="mh-empty-sub">Start completing missions to see your domain stats!</p>
            </div>
        );
    }

    return (
        <div className="mh-tab-content">
            <div className="mh-section-title">Completion Rate by Domain</div>
            {ALL_DOMAINS.map(key => {
                const meta  = DOMAIN_META[key];
                const s     = stats[key];
                const pct   = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                const share = totalMissions > 0 ? Math.round((s.total / totalMissions) * 100) : 0;

                return (
                    <div key={key} className="mh-domain-card">
                        <div className="mh-domain-card-header">
                            <span className="mh-domain-icon">{meta.icon}</span>
                            <span className="mh-domain-name">{meta.label}</span>
                            <span className="mh-domain-pct" style={{ color: meta.color }}>{pct}%</span>
                        </div>
                        <PctBar pct={pct} color={meta.color} />
                        <div className="mh-domain-meta">
                            <span>{s.completed}/{s.total} missions done</span>
                            <span className="mh-domain-share">{share}% of all missions</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Tab 3: All Time ──────────────────────────────────────────────────────────

function TabAllTime({ history }) {
    const total     = history.reduce((s, r) => s + (r.missions?.length ?? 0), 0);
    const completed = history.reduce((s, r) => s + (r.missions?.filter(m => m.completed).length ?? 0), 0);
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Domain share of total missions (pie-like breakdown)
    const domainStats = aggregateDomains(history);

    if (history.length === 0) {
        return (
            <div className="mh-empty">
                <p>No mission history yet.</p>
                <p className="mh-empty-sub">Come back after your first day of missions!</p>
            </div>
        );
    }

    return (
        <div className="mh-tab-content">
            {/* Overall summary */}
            <div className="mh-week-summary">
                <div className="mh-summary-row">
                    <span className="mh-summary-label">Overall completion</span>
                    <span className="mh-summary-pct" style={{ color: pct >= 70 ? '#2f9e7a' : '#c9184a' }}>
            {pct}%
          </span>
                </div>
                <PctBar pct={pct} color={pct >= 70 ? '#2f9e7a' : '#c9184a'} />
                <p className="mh-summary-sub">
                    {completed} of {total} missions · {history.length} days tracked
                </p>
            </div>

            {/* Domain distribution */}
            <div className="mh-section-title">Domain Distribution</div>
            <div className="mh-domain-strips">
                {ALL_DOMAINS.map(key => {
                    const meta  = DOMAIN_META[key];
                    const s     = domainStats[key];
                    const share = total > 0 ? Math.round((s.total / total) * 100) : 0;
                    return (
                        <div
                            key={key}
                            className="mh-domain-strip"
                            style={{ flex: share, background: meta.color }}
                            title={`${meta.label}: ${share}%`}
                        />
                    );
                })}
            </div>
            <div className="mh-domain-legend">
                {ALL_DOMAINS.map(key => {
                    const meta  = DOMAIN_META[key];
                    const s     = domainStats[key];
                    const share = total > 0 ? Math.round((s.total / total) * 100) : 0;
                    return (
                        <div key={key} className="mh-legend-item">
                            <span className="mh-legend-dot" style={{ background: meta.color }} />
                            <span className="mh-legend-label">{meta.icon} {meta.label}</span>
                            <span className="mh-legend-pct">{share}%</span>
                        </div>
                    );
                })}
            </div>

            {/* Full day-by-day log */}
            <div className="mh-section-title" style={{ marginTop: 20 }}>Full History</div>
            {history.map(rec => (
                <DayRow key={rec.dayKey} record={rec} />
            ))}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = ['This Week', 'By Domain', 'All Time'];

export default function MissionHistory({ user, onBack }) {
    const [activeTab, setActiveTab] = useState(0);
    const [history, setHistory]     = useState([]);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        setLoading(true);
        loadHistory(user.uid)
            .then(setHistory)
            .finally(() => setLoading(false));
    }, [user?.uid]);

    return (
        <div className="mh-shell">
            {/* Top bar */}
            <div className="mh-topbar">
                <button type="button" className="mh-back-btn" onClick={onBack}>
                    ← Back
                </button>
                <h1 className="mh-page-title">Mission History</h1>
            </div>

            {/* Tabs */}
            <div className="mh-tab-bar">
                {TABS.map((label, i) => (
                    <button
                        key={label}
                        type="button"
                        className={`mh-tab-btn ${activeTab === i ? 'mh-tab-btn--active' : ''}`}
                        onClick={() => setActiveTab(i)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="mh-loading">Loading history…</div>
            ) : (
                <>
                    {activeTab === 0 && <TabThisWeek history={history} />}
                    {activeTab === 1 && <TabByDomain history={history} />}
                    {activeTab === 2 && <TabAllTime  history={history} />}
                </>
            )}
        </div>
    );
}