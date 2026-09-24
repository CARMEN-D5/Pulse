/**
 * Displays today's 3 daily missions with a checklist UI.
 * Renders a "History" button that opens MissionHistory.
 *
 * Props:
 *   user          Firebase user object  (needs uid)
 *   domainScores  { spirituality, relationships, productivity, health, finance }
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from '../components/Icon';
import { ShareButton, useAutoSharePrompt } from '../components/share';
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
import MissionHistory, { MissionHistoryBody } from '../missions/MissionHistory';
import { DOMAIN_META } from '../missions/missionPools';
import { colors, domains, fonts, radius, shadow, spacing, type } from '../theme';
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from '../tutorial';

// historyPlacement: "header" (default, pill next to the share button, opens
// history in a modal) | "below" (the full mission history rendered inline
// under the mission list, used on the full Daily Missions page) | "hidden"
// (Home's inline card — checkboxes/progress stay live, no History at all).
// compact: tighter padding/spacing and a single-line item row (icon chip
// instead of the full domain label) — used only for Home's inline card, so
// the whole dashboard can fit on screen without scrolling.
export default function DailyMissions({ user, domainScores, tutorialEnabled = false, historyPlacement = 'header', compact = false }) {
    const [missions, setMissions]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showHistory, setShowHistory] = useState(false);

    const uid      = user?.uid;
    const progress = missions.filter(m => m.completed).length;
    useTutorial('missions', { enabled: tutorialEnabled && !loading && missions.length > 0 });

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

    // ── Sharing ───────────────────────────────────────────────────────────────

    const sharePayload = useMemo(() => ({
        dayKey:         getDayKey(),
        completedCount: progress,
        totalCount:     missions.length,
        missions:       missions.map(m => ({
            domain:    m.domain,
            text:      m.text,
            completed: Boolean(m.completed),
        })),
    }), [missions, progress]);

    const sawIncomplete = useRef(false);
    useEffect(() => {
        if (!loading && missions.length > 0 && progress < missions.length) {
            sawIncomplete.current = true;
        }
    }, [loading, progress, missions.length]);

    useAutoSharePrompt({
        when:    missions.length > 0 && progress === missions.length,
        domain:  'missions',
        payload: sharePayload,
        key:     getDayKey(),
        enabled: !loading && sawIncomplete.current,
    });

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
            <View style={[styles.card, compact && styles.cardCompact, shadow('md')]}>
                <Text style={styles.loadingText}>Loading your daily missions…</Text>
            </View>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <View style={[styles.card, compact && styles.cardCompact, shadow('md')]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Icon name="target" size={16} color={colors.pulsePrimary} />
                    <Text style={styles.title}>Today's Daily Missions</Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.progressLabel}>{progress}/3 done</Text>
                    {/* Manual share. Hides itself while nothing is ticked, so
                        the user never taps into an empty prompt. */}
                    <ShareButton domain="missions" payload={sharePayload} />
                    {historyPlacement === 'header' ? (
                    <TutorialTarget id={TUTORIAL_TARGETS.missions.history}>
                    <Pressable
                        onPress={() => setShowHistory(true)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
                    >
                        <Icon name="history" size={14} color={colors.pulsePrimaryDark} />
                        <Text style={styles.historyBtnText}>History</Text>
                    </Pressable>
                    </TutorialTarget>
                    ) : null}
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
            <TutorialTarget id={TUTORIAL_TARGETS.missions.list}>
            <View style={[styles.list, compact && styles.listCompact]}>
                {missions.map((mission, idx) => {
                    const meta = DOMAIN_META[mission.domain] ?? { label: mission.domain, color: '#888' };
                    const domainIcon = domains[mission.domain]?.icon ?? 'star';
                    return (
                        <View
                            key={idx}
                            style={[styles.item, compact && styles.itemCompact, mission.completed && styles.itemDone]}
                        >
                            <Pressable
                                onPress={() => toggleComplete(idx)}
                                hitSlop={8}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: mission.completed }}
                                accessibilityLabel={mission.completed ? 'Mark incomplete' : 'Mark complete'}
                                style={[
                                    styles.checkbox,
                                    compact && styles.checkboxCompact,
                                    mission.completed
                                        ? { backgroundColor: meta.color, borderColor: meta.color }
                                        : { borderColor: meta.color },
                                ]}
                            >
                                {mission.completed ? <Icon name="check" size={compact ? 12 : 14} color="#fff" /> : null}
                            </Pressable>

                            {compact ? (
                                <View style={styles.contentCompact}>
                                    <Text
                                        style={[styles.textCompact, mission.completed && styles.textDone]}
                                        numberOfLines={1}
                                    >
                                        {mission.text}
                                    </Text>
                                    <View style={[styles.domainChip, { backgroundColor: `${meta.color}1A` }]}>
                                        <Icon name={domainIcon} size={11} color={meta.color} />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.content}>
                                    <Text style={[styles.text, mission.completed && styles.textDone]}>
                                        {mission.text}
                                    </Text>
                                    <View style={styles.domainTagRow}>
                                        <Icon name={domainIcon} size={14} color={meta.color} />
                                        <Text style={[styles.domainTag, { color: meta.color }]}>
                                            {meta.label}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
            </TutorialTarget>

            {progress === 3 ? (
                <View style={[styles.doneBanner, compact && styles.doneBannerCompact]}>
                    <Text style={styles.doneBannerText}>
                        🎉 All missions complete! Great work today.
                    </Text>
                </View>
            ) : null}

            {historyPlacement === 'below' ? (
                <TutorialTarget id={TUTORIAL_TARGETS.missions.history}>
                <View style={styles.historyBelow}>
                    <View style={styles.historyBelowHeading}>
                        <Icon name="history" size={14} color={colors.textMuted} />
                        <Text style={styles.historyBelowHeadingText}>Mission History</Text>
                    </View>
                    <MissionHistoryBody user={user} />
                </View>
                </TutorialTarget>
            ) : null}

            {historyPlacement === 'header' ? historyOverlay : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        gap: spacing.md,
    },
    cardCompact: {
        borderRadius: 16,
        padding: spacing.md,
        gap: spacing.sm,
    },
    pressed: { opacity: 0.7 },
    loadingText: { ...type.small, color: colors.textMuted, textAlign: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
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
    historyBelow: {
        gap: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    historyBelowHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    historyBelowHeadingText: {
        ...type.caption,
        fontFamily: fonts.bold,
        fontSize: 12,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: colors.textMuted,
    },

    barTrack: {
        height: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.pulseBgTintAlt,
        overflow: 'hidden',
    },
    barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.pulsePrimary },

    list: { gap: spacing.md },
    listCompact: { gap: spacing.xs },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: 14,
        backgroundColor: colors.rowTint,
    },
    itemCompact: {
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
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
    checkboxCompact: { width: 20, height: 20 },
    content: { flex: 1, gap: 3 },
    text: { ...type.small, fontSize: 14, color: colors.text },
    textDone: { textDecorationLine: 'line-through', color: colors.textMuted },
    domainTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    domainTag: {
        ...type.caption,
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    // Compact single-line row: text plus a small tinted domain-icon chip,
    // in place of the two-line text/label stack used elsewhere.
    contentCompact: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    textCompact: { ...type.small, fontSize: 13, color: colors.text, flex: 1 },
    domainChip: {
        width: 22,
        height: 22,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },

    doneBanner: {
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: 'rgba(47, 158, 122, 0.12)',
    },
    doneBannerCompact: { padding: spacing.sm },
    doneBannerText: { ...type.small, textAlign: 'center', color: colors.success },
});