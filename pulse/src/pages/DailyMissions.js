/**
  * Displays today's 3 daily missions with a checklist UI.
 * Renders a "History" button that opens MissionHistory.
 *
 * Props:
 *   user          Firebase user object  (needs uid)
 *   domainScores  { spirituality, relationships, productivity, health, finance }
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from '../components/Icon';
import { logAction } from '../firestore/scoring';
import {
    analyseScores,
    archiveDay,
    generateDailyMissions,
    getDayKey,
    getWeekKey,
    loadDailyDoc,
    saveDailyDoc,
} from '../missions/missionEngine';
import MissionHistory from '../missions/MissionHistory';
import { DOMAIN_META } from '../missions/missionPools';
import { colors, fonts, radius, shadow, spacing, type } from '../theme';

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
    // A modal rather than a swap of this card's contents: the card now sits
    // inside the Home tab, so replacing it in place would leave the app bar and
    // the tab bar framing a full-screen history view.

    const historyOverlay = (
        <Modal
            visible={showHistory}
            animationType="slide"
            onRequestClose={() => setShowHistory(false)}
        >
            <MissionHistory user={user} onBack={() => setShowHistory(false)} />
        </Modal>
    );

    // ── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={[styles.card, shadow('md')]}>
                <Text style={styles.loadingText}>Loading your daily missions…</Text>
            </View>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <View style={[styles.card, shadow('md')]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.headerIcon}>🎯</Text>
                    <Text style={styles.title}>Today's Daily Missions</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.progressLabel}>{progress}/3 done</Text>
                    <Pressable
                        onPress={() => setShowHistory(true)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
                    >
                        <Icon name="history" size={14} color={colors.pulsePrimaryDark} />
                        <Text style={styles.historyBtnText}>History</Text>
                    </Pressable>
                </View>
            </View>

            {/* Progress bar */}
            <View
                style={styles.barTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{ now: progress, min: 0, max: 3 }}
            >
                <View style={[styles.barFill, { width: `${(progress / 3) * 100}%` }]} />
            </View>

            {/* Mission list */}
            <View style={styles.list}>
                {missions.map((mission, idx) => {
                    const meta = DOMAIN_META[mission.domain] ?? { label: mission.domain, icon: '⭐', color: '#888' };
                    return (
                        <View key={idx} style={[styles.item, mission.completed && styles.itemDone]}>
                            <Pressable
                                onPress={() => toggleComplete(idx)}
                                hitSlop={8}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: mission.completed }}
                                accessibilityLabel={mission.completed ? 'Mark incomplete' : 'Mark complete'}
                                style={[
                                    styles.checkbox,
                                    mission.completed
                                        ? { backgroundColor: meta.color, borderColor: meta.color }
                                        : { borderColor: meta.color },
                                ]}
                            >
                                {mission.completed ? <Icon name="check" size={14} color="#fff" /> : null}
                            </Pressable>

                            <View style={styles.content}>
                                <Text style={[styles.text, mission.completed && styles.textDone]}>
                                    {mission.text}
                                </Text>
                                <Text style={[styles.domainTag, { color: meta.color }]}>
                                    {meta.icon} {meta.label}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {progress === 3 ? (
                <View style={styles.doneBanner}>
                    <Text style={styles.doneBannerText}>
                        🎉 All missions complete! Great work today.
                    </Text>
                </View>
            ) : null}

            {historyOverlay}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 20,
        gap: spacing.md,
    },
    pressed: { opacity: 0.7 },
    loadingText: { ...type.small, color: colors.textMuted, textAlign: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    headerIcon: { fontSize: 16 },
    title: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text, flexShrink: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    progressLabel: {
        ...type.caption,
        fontFamily: fonts.bold,
        fontSize: 11,
        color: colors.pulsePrimary,
    },
    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        backgroundColor: colors.rowTint,
        borderWidth: 1,
        borderColor: colors.pulseBgTint,
    },
    historyBtnText: {
        ...type.caption,
        fontFamily: fonts.bold,
        fontSize: 11,
        color: colors.pulsePrimaryDark,
    },

    barTrack: {
        height: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.pulseBgTintAlt,
        overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.pulsePrimary },

    list: { gap: spacing.md },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 14,
        backgroundColor: colors.rowTint,
    },
    itemDone: { opacity: 0.65 },
    // Circular in the refreshed design — the ring reads as "not done yet"
    // while a filled circle marks completion.
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: radius.pill,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: { flex: 1, gap: 3 },
    text: { ...type.small, fontSize: 14, color: colors.text },
    textDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    domainTag: {
        ...type.caption,
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    doneBanner: {
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: 'rgba(47, 158, 122, 0.12)',
    },
    doneBannerText: { ...type.small, textAlign: 'center', color: colors.success },
});
