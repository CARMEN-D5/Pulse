/**
  * Displays today's 3 daily missions with a checklist UI.
 * Renders a "History" button that opens MissionHistory.
 *
 * Props:
 *   user          Firebase user object  (needs uid)
 *   domainScores  { spirituality, relationships, productivity, health, finance }
 */

import React, { useEffect, useState, useCallback } from 'react';
import { DOMAIN_META } from '../missions/missionPools';
import { logAction } from '../firestore/scoring';
import {
    getDayKey,
    getWeekKey,
    analyseScores,
    generateDailyMissions,
    loadDailyDoc,
    saveDailyDoc,
    archiveDay,
} from '../missions/missionEngine';
import MissionHistory from '../missions/MissionHistory';
import '../missions/DailyMissions.css';

export default function DailyMissions({ user, domainScores }) {
    const [missions, setMissions]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const uid      = user?.uid;
    const progress = missions.filter(m => m.completed).length;

    // ── Initialise / refresh missions ─────────────────────────────────────────

    const initMissions = useCallback(async () => {
        if (!uid) return;
        setLoading(true);

        const today    = getDayKey();
        const thisWeek = getWeekKey();
        const stored   = await loadDailyDoc(uid);

        let fixedDomains = [];
        let weeklyUsed   = [];

        if (stored?.weekKey === thisWeek) {
            // Same week → reuse existing fixed domains and used-list
            fixedDomains = stored.fixedDomains ?? [];
            weeklyUsed   = stored.weeklyUsed   ?? [];
        } else {
            // New week → recalculate fixed domains from current scores
            const { lowestDomain, secondLowestDomain } = analyseScores(domainScores);
            if (lowestDomain)       fixedDomains.push(lowestDomain);
            if (secondLowestDomain) fixedDomains.push(secondLowestDomain);
        }

        // Same day → restore missions as-is (preserve completion state)
        if (
            stored?.dayKey  === today &&
            stored?.weekKey === thisWeek &&
            stored?.missions?.length === 3
        ) {
            setMissions(stored.missions);
            setLoading(false);
            return;
        }

        // New day → archive yesterday before generating new ones
        if (stored?.missions?.length > 0 && stored?.dayKey !== today) {
            await archiveDay(uid, stored.dayKey, stored.weekKey, stored.missions);
        }

        // Generate fresh missions for today
        const raw         = generateDailyMissions(domainScores, weeklyUsed, fixedDomains);
        const newMissions = raw.map(m => ({ ...m, completed: false }));
        const updatedWeeklyUsed = [...weeklyUsed, ...newMissions.map(m => m.text)];

        const payload = {
            dayKey:       today,
            weekKey:      thisWeek,
            fixedDomains,
            weeklyUsed:   updatedWeeklyUsed,
            missions:     newMissions,
        };

        await saveDailyDoc(uid, payload);
        setMissions(newMissions);
        setLoading(false);
    }, [uid, domainScores]);

    useEffect(() => {
        initMissions();
    }, [initMissions]);

    // ── Toggle completion ─────────────────────────────────────────────────────

    const toggleComplete = async (idx) => {
        const mission = missions[idx];
        const wasCompleted = mission.completed;
        const updated = missions.map((m, i) =>
            i === idx ? { ...m, completed: !m.completed } : m
        );
        setMissions(updated);
        const stored = await loadDailyDoc(uid);
        await saveDailyDoc(uid, { ...stored, missions: updated });

        // Score: log action when mission is newly completed (not un-completed)
        if (!wasCompleted && mission.domain) {
            const domainActions = {
                spirituality: 'mindfulness',
                relationships: 'connection',
                productivity: 'task',
                health: 'exercise',
                finance: 'budget',
            };
            const actionType = domainActions[mission.domain];
            if (actionType) logAction(uid, mission.domain, actionType);
        }
    };

    // ── History overlay ───────────────────────────────────────────────────────

    if (showHistory) {
        return <MissionHistory user={user} onBack={() => setShowHistory(false)} />;
    }

    // ── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="dm-card dm-card--loading">
                <p>Loading your daily missions…</p>
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <div className="dm-card">
            {/* Header */}
            <div className="dm-header">
                <div className="dm-title-row">
                    <span className="dm-icon" aria-hidden="true">🎯</span>
                    <h2 className="dm-title">Today's Daily Missions</h2>
                </div>
                <div className="dm-header-right">
                    <span className="dm-progress-label">{progress}/3 done</span>
                    <button
                        type="button"
                        className="dm-history-btn"
                        onClick={() => setShowHistory(true)}
                    >
                        📋 History
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="dm-bar-track" role="progressbar" aria-valuenow={progress} aria-valuemax={3}>
                <div className="dm-bar-fill" style={{ width: `${(progress / 3) * 100}%` }} />
            </div>

            {/* Mission list */}
            <ul className="dm-list">
                {missions.map((mission, idx) => {
                    const meta = DOMAIN_META[mission.domain] ?? { label: mission.domain, icon: '⭐', color: '#888' };
                    return (
                        <li
                            key={idx}
                            className={`dm-item ${mission.completed ? 'dm-item--done' : ''}`}
                        >
                            <button
                                type="button"
                                className="dm-checkbox"
                                aria-label={mission.completed ? 'Mark incomplete' : 'Mark complete'}
                                style={
                                    mission.completed
                                        ? { background: meta.color, borderColor: meta.color }
                                        : { borderColor: meta.color }
                                }
                                onClick={() => toggleComplete(idx)}
                            >
                                {mission.completed ? '✓' : ''}
                            </button>
                            <div className="dm-content">
                                <p className="dm-text">{mission.text}</p>
                                <span className="dm-domain-tag" style={{ color: meta.color }}>
                  {meta.icon} {meta.label}
                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {progress === 3 && (
                <div className="dm-done-banner">
                    🎉 All missions complete! Great work today.
                </div>
            )}
        </div>
    );
}