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
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Loading, Screen, ScreenHeader } from '../components/ui';
import { colors, fonts, radius, shadow, spacing, type } from '../theme';
import { getWeekKey, getWeekRange, loadDailyDoc, loadHistory } from './missionEngine';
import { ALL_DOMAINS, DOMAIN_META } from './missionPools';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short day label: "Mon 12 May" */
function formatDay(dayKey) {
    const d = new Date(dayKey + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatWeekRange(date = new Date()) {
    const { start, end } = getWeekRange(date);
    const startLabel = start.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const endLabel = end.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
        const month = end.toLocaleDateString('en-AU', { month: 'long' });
        return `${start.getDate()}–${end.getDate()} ${month}`;
    }
    return `${startLabel}–${endLabel}`;
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
        <View style={styles.pctTrack}>
            <View style={[styles.pctFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
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
        <View style={styles.dayRow}>
            <Pressable
                onPress={() => setOpen(o => !o)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={({ pressed }) => [styles.dayHeader, pressed && styles.pressed]}
            >
                <View style={styles.dayLeft}>
                    <Text style={styles.dayLabel}>{formatDay(record.dayKey)}</Text>
                    <View style={[styles.dayBadge, allDone && styles.dayBadgeDone]}>
                        <Text style={[styles.dayBadgeText, allDone && styles.dayBadgeTextDone]}>
                            {completed}/{total}
                        </Text>
                    </View>
                </View>

                <View style={styles.dayRight}>
                    <Text style={[styles.dayPct, { color: allDone ? '#3A8F70' : '#B33D54' }]}>
                        {pct}%
                    </Text>
                    <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                </View>
            </Pressable>

            {open ? (
                <View style={styles.missionList}>
                    {(record.missions ?? []).map((m, i) => {
                        const meta = DOMAIN_META[m.domain] ?? { label: m.domain, icon: '⭐', color: '#888' };
                        return (
                            <View key={i} style={[styles.missionItem, m.completed && styles.missionItemDone]}>
                                <View
                                    style={[
                                        styles.missionDot,
                                        { backgroundColor: m.completed ? meta.color : '#ddd' },
                                    ]}
                                />
                                <View style={styles.missionBody}>
                                    <Text style={styles.missionText}>{m.text}</Text>
                                    <Text style={[styles.missionDomain, { color: meta.color }]}>
                                        {meta.icon} {meta.label}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.missionStatus,
                                        m.completed && styles.missionStatusDone,
                                    ]}
                                >
                                    {m.completed ? '✓ Done' : '✗ Missed'}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            ) : null}
        </View>
    );
}

function EmptyTab({ title, sub }) {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySub}>{sub}</Text>
        </View>
    );
}

// ─── Tab 1: This Week ─────────────────────────────────────────────────────────

function TabThisWeek({ history }) {
    const thisWeek   = getWeekKey();
    const weekRecs   = history.filter(r => r.weekKey === thisWeek);
    const total      = weekRecs.reduce((s, r) => s + (r.missions?.length ?? 0), 0);
    const completed  = weekRecs.reduce((s, r) => s + (r.missions?.filter(m => m.completed).length ?? 0), 0);
    const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
    const color = pct >= 70 ? '#3A8F70' : '#B33D54';

    if (weekRecs.length === 0) {
        return (
            <EmptyTab
                title="No mission history yet for this week."
                sub="Complete today's missions and come back tomorrow!"
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            {/* Week summary */}
            <View style={[styles.summary, shadow('sm')]}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>This week · {formatWeekRange()}</Text>
                    <Text style={[styles.summaryPct, { color }]}>{pct}%</Text>
                </View>
                <PctBar pct={pct} color={color} />
                <Text style={styles.summarySub}>{completed} of {total} missions completed</Text>
            </View>

            {/* Daily breakdown */}
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            {weekRecs.map(rec => (
                <DayRow key={rec.dayKey} record={rec} />
            ))}
        </View>
    );
}

// ─── Tab 2: By Domain ─────────────────────────────────────────────────────────

function TabByDomain({ history }) {
    const stats = aggregateDomains(history);
    const totalMissions = Object.values(stats).reduce((s, v) => s + v.total, 0);

    if (totalMissions === 0) {
        return (
            <EmptyTab
                title="No mission history yet."
                sub="Start completing missions to see your domain stats!"
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Completion Rate by Domain</Text>
            {ALL_DOMAINS.map(key => {
                const meta  = DOMAIN_META[key];
                const s     = stats[key];
                const pct   = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                const share = totalMissions > 0 ? Math.round((s.total / totalMissions) * 100) : 0;

                return (
                    <View key={key} style={[styles.domainCard, shadow('sm')]}>
                        <View style={styles.domainCardHeader}>
                            <Text style={styles.domainIcon}>{meta.icon}</Text>
                            <Text style={styles.domainName}>{meta.label}</Text>
                            <Text style={[styles.domainPct, { color: meta.color }]}>{pct}%</Text>
                        </View>
                        <PctBar pct={pct} color={meta.color} />
                        <View style={styles.domainMeta}>
                            <Text style={styles.domainMetaText}>{s.completed}/{s.total} missions done</Text>
                            <Text style={styles.domainMetaText}>{share}% of all missions</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Tab 3: All Time ──────────────────────────────────────────────────────────

function TabAllTime({ history }) {
    const total     = history.reduce((s, r) => s + (r.missions?.length ?? 0), 0);
    const completed = history.reduce((s, r) => s + (r.missions?.filter(m => m.completed).length ?? 0), 0);
    const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
    const color = pct >= 70 ? '#3A8F70' : '#B33D54';

    // Domain share of total missions (pie-like breakdown)
    const domainStats = aggregateDomains(history);

    if (history.length === 0) {
        return (
            <EmptyTab
                title="No mission history yet."
                sub="Come back after your first day of missions!"
            />
        );
    }

    return (
        <View style={styles.tabContent}>
            {/* Overall summary */}
            <View style={[styles.summary, shadow('sm')]}>
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Overall completion</Text>
                    <Text style={[styles.summaryPct, { color }]}>{pct}%</Text>
                </View>
                <PctBar pct={pct} color={color} />
                <Text style={styles.summarySub}>
                    {completed} of {total} missions · {history.length} days tracked
                </Text>
            </View>

            {/* Domain distribution */}
            <Text style={styles.sectionTitle}>Domain Distribution</Text>
            <View style={styles.strips}>
                {ALL_DOMAINS.map(key => {
                    const meta  = DOMAIN_META[key];
                    const s     = domainStats[key];
                    const share = total > 0 ? Math.round((s.total / total) * 100) : 0;
                    // flex: 0 collapses a domain with no missions, same as the
                    // web build's `flex: share`.
                    return (
                        <View
                            key={key}
                            style={{ flex: share, backgroundColor: meta.color }}
                            accessibilityLabel={`${meta.label}: ${share}%`}
                        />
                    );
                })}
            </View>

            <View style={styles.domainLegend}>
                {ALL_DOMAINS.map(key => {
                    const meta  = DOMAIN_META[key];
                    const s     = domainStats[key];
                    const share = total > 0 ? Math.round((s.total / total) * 100) : 0;
                    return (
                        <View key={key} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: meta.color }]} />
                            <Text style={styles.legendLabel}>{meta.icon} {meta.label}</Text>
                            <Text style={styles.legendPct}>{share}%</Text>
                        </View>
                    );
                })}
            </View>

            {/* Full day-by-day log */}
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Full History</Text>
            {history.map(rec => (
                <DayRow key={rec.dayKey} record={rec} />
            ))}
        </View>
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
        Promise.all([
            loadHistory(user.uid),
            loadDailyDoc(user.uid),
        ]).then(([hist, todayDoc]) => {
            if (todayDoc?.missions?.length > 0) {
                setHistory([todayDoc, ...hist]);
            } else {
                setHistory(hist);
            }
        }).finally(() => setLoading(false));
    }, [user?.uid]);

    return (
        <Screen contentContainerStyle={styles.screen} keyboardAvoiding={false}>
            <ScreenHeader title="Mission History" onBack={onBack} />

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map((label, i) => (
                    <Pressable
                        key={label}
                        onPress={() => setActiveTab(i)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activeTab === i }}
                        style={({ pressed }) => [
                            styles.tabBtn,
                            activeTab === i && styles.tabBtnActive,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={[styles.tabBtnText, activeTab === i && styles.tabBtnTextActive]}>
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <Loading label="Loading history…" style={styles.loading} />
            ) : (
                <>
                    {activeTab === 0 && <TabThisWeek history={history} />}
                    {activeTab === 1 && <TabByDomain history={history} />}
                    {activeTab === 2 && <TabAllTime  history={history} />}
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { gap: spacing.md, paddingBottom: 40 },
    pressed: { opacity: 0.7 },
    loading: { paddingVertical: 60 },

    tabBar: { flexDirection: 'row', gap: 6 },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    tabBtnActive: { backgroundColor: colors.pulsePrimary, borderColor: colors.pulsePrimary },
    tabBtnText: { ...type.small, fontSize: 13, color: colors.text },
    tabBtnTextActive: { color: '#fff', fontFamily: fonts.semibold },

    tabContent: { gap: spacing.md },
    sectionTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
    sectionTitleSpaced: { marginTop: 20 },

    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: 48 },
    emptyTitle: { ...type.body, color: colors.text, textAlign: 'center' },
    emptySub: { ...type.small, color: colors.textMuted, textAlign: 'center' },

    summary: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { ...type.small, color: colors.text },
    summaryPct: { ...type.h3, fontFamily: fonts.extrabold },
    summarySub: { ...type.caption, color: colors.textMuted },

    pctTrack: {
        height: 8,
        borderRadius: radius.pill,
        backgroundColor: colors.pulseBgTintAlt,
        overflow: 'hidden',
    },
    pctFill: { height: '100%', borderRadius: radius.pill },

    dayRow: {
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        gap: spacing.sm,
    },
    dayLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
    dayLabel: { ...type.small, color: colors.text },
    dayBadge: {
        paddingHorizontal: 7,
        paddingVertical: 1,
        borderRadius: radius.pill,
        backgroundColor: colors.pulseBg,
    },
    dayBadgeDone: { backgroundColor: 'rgba(47,158,122,0.15)' },
    dayBadgeText: { ...type.caption, fontSize: 10, color: colors.textMuted },
    dayBadgeTextDone: { color: colors.success },
    dayRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dayPct: { ...type.label, fontSize: 13 },
    chevron: { ...type.caption, fontSize: 9, color: colors.textMuted },

    missionList: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    missionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    missionItemDone: { opacity: 0.75 },
    missionDot: { width: 8, height: 8, borderRadius: radius.pill, marginTop: 5 },
    missionBody: { flex: 1, gap: 1 },
    missionText: { ...type.small, fontSize: 12, color: colors.text },
    missionDomain: { ...type.caption, fontSize: 10 },
    missionStatus: { ...type.caption, fontSize: 10, color: '#B33D54' },
    missionStatusDone: { color: colors.success },

    domainCard: {
        backgroundColor: colors.card,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: 6,
    },
    domainCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    domainIcon: { fontSize: 15 },
    domainName: { ...type.label, fontSize: 13, flex: 1, color: colors.text },
    domainPct: { ...type.label, fontFamily: fonts.bold, fontSize: 13 },
    domainMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    domainMetaText: { ...type.caption, fontSize: 10, color: colors.textMuted },

    strips: { flexDirection: 'row', height: 12, borderRadius: radius.pill, overflow: 'hidden' },
    domainLegend: { gap: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: radius.pill },
    legendLabel: { ...type.caption, fontSize: 11, flex: 1, color: colors.text },
    legendPct: { ...type.caption, fontSize: 11, color: colors.textMuted },
});
