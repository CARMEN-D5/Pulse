import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { MoodFace, MOODS } from "./adapters";
import { colors, fonts, radius, spacing, type } from "../../theme";

/**
 * share card templates
 *
 * each template:
 *   id          unique key, stored on the post as `templateId`
 *   domain      journal | fitness | todo | finance
 *   label       shown under the carousel
 *   isAvailable (payload) => bool   hide templates the payload can't fill
 *   title       (payload) => string pre-filled reflection text
 *   render      (payload, ctx) => JSX   the square card itself
 *
 * PAYLOAD SHAPES — all taken from the real docs
 *
 *   journal   moodData[dateKey] plus its key:
 *             { key, moodId, journalText, emotions }
 *
 *   fitness   a physicalActivities doc:
 *             { text, description, type: "cardio" | "strength",
 *               distance, duration,                       // cardio
 *               exercises: [{ name, sets: [{ weight, reps }] }],  // strength
 *               activityDate }
 *             Note: `sets` is an array of individual sets, and every numeric
 *             field arrives as a string from the form inputs.
 *
 *   todo      { completedCount, totalCount, date }
 *
 *   finance   { kind: "month-under" | "category-under", … }
 *             see the finance section for each kind's fields
 */

/* ---------- helpers ---------- */

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const money = (v) => `$${num(v).toFixed(0)}`;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const moodOf = (moodId) => MOODS.find((m) => m.id === moodId) ?? null;

/**
 * Used when a stored payload has a moodId that no longer exists — a corrupted
 * entry, or a mood removed from MOODS after the post was created.
 *
 * `isAvailable` already keeps unknown moods out of the carousel, but the feed
 * calls `render` directly on whatever was saved, with no such gate. Without
 * this fallback a single bad post would crash the whole feed on `m.label`.
 */
const UNKNOWN_MOOD = {
    label: "Something",
    color: "#8a8a96",
    bg: "#f1f1f4",
    textColor: "#4a4a55",
};

const moodOrFallback = (moodId) => moodOf(moodId) ?? UNKNOWN_MOOD;

/**
 * Strength totals. Every value in the doc is a string ("60", "", "8"), so
 * everything goes through num() before it's added up.
 */
export const workoutStats = (activity = {}) => {
    const exercises = activity.exercises ?? [];
    let setCount = 0;
    let volumeKg = 0;
    for (const ex of exercises) {
        for (const s of ex.sets ?? []) {
            setCount += 1;
            volumeKg += num(s.weight) * num(s.reps);
        }
    }
    return {
        exerciseCount: exercises.length,
        setCount,
        volumeKg: Math.round(volumeKg),
    };
};

/** Heaviest set in an exercise, for the one-line summary. */
const topWeight = (ex) =>
    (ex.sets ?? []).reduce((max, s) => Math.max(max, num(s.weight)), 0);

const hasRealSets = (activity) =>
    (activity?.exercises ?? []).some((ex) =>
        (ex.sets ?? []).some((s) => num(s.reps) > 0 || num(s.weight) > 0)
    );

/* ---------- shared card chrome ---------- */

/**
 * `tint` lets a card take a colour trio instead of the app accent — journal
 * cards use the logged mood's colours, finance cards use the category's.
 *
 * The card is a fixed-aspect square so the carousel can page it cleanly and
 * so what the user previews matches what lands in the feed.
 */
const Card = ({ children, username, tint }) => (
    <View
        style={[
            styles.card,
            tint && { backgroundColor: tint.bg, borderColor: `${tint.color}33` },
        ]}
    >
        <View style={styles.cardBody}>{children}</View>
        <Text style={[styles.handle, tint?.textColor && { color: tint.textColor }]}>
            @{username ?? "username"}
        </Text>
    </View>
);

const Stat = ({ value, label }) => (
    <View style={styles.stat}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

/**
 * Progress ring. Same strokeDasharray/strokeDashoffset technique DonutChart
 * uses, via react-native-svg. The label sits in a centred overlay rather than
 * an SVG <text>, which keeps it on the app font across platforms.
 */
const Ring = ({ pct, children, stroke }) => {
    const R = 52;
    const C = 2 * Math.PI * R;
    const clamped = Math.max(0, Math.min(100, pct));
    return (
        <View style={styles.ringWrap} accessibilityLabel={`${Math.round(clamped)} percent`}>
            <Svg width={128} height={128} viewBox="0 0 128 128">
                <Circle cx="64" cy="64" r={R} stroke={colors.rowTint} strokeWidth={12} fill="none" />
                <Circle
                    cx="64"
                    cy="64"
                    r={R}
                    stroke={stroke || colors.blPrimary}
                    strokeWidth={12}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={C}
                    strokeDashoffset={C - (C * clamped) / 100}
                    transform="rotate(-90 64 64)"
                />
            </Svg>
            <View style={styles.ringLabel} pointerEvents="none">
                <Text style={styles.ringText}>{children}</Text>
            </View>
        </View>
    );
};

/* ---------- templates ---------- */

export const TEMPLATES = [
    /* ============ SPIRITUALITY — JOURNAL ============ */
    {
        id: "journal-quote",
        domain: "journal",
        label: "Entry",
        isAvailable: (p) => Boolean(p?.journalText?.trim()),
        title: () => "A thought from today",
        render: (p, ctx) => (
            <Card username={ctx.username} tint={moodOf(p.moodId)}>
                <Text style={styles.quote}>“{p.journalText}”</Text>
            </Card>
        ),
    },
    {
        id: "journal-mood",
        domain: "journal",
        label: "Mood",
        isAvailable: (p) => Boolean(moodOf(p?.moodId)),
        title: (p) =>
            `Today I'm feeling ${moodOrFallback(p?.moodId).label.toLowerCase()}`,
        render: (p, ctx) => {
            const m = moodOrFallback(p?.moodId);
            return (
                <Card username={ctx.username} tint={m}>
                    <Text style={styles.caption}>Today I'm feeling</Text>
                    <MoodFace moodId={p.moodId} size={84} selected />
                    <Text style={styles.moodLabel}>{m.label}</Text>
                    {p.emotions?.length > 0 && (
                        <View style={styles.tags}>
                            {p.emotions.slice(0, 4).map((tag) => (
                                <Text
                                    key={tag}
                                    style={[
                                        styles.tag,
                                        { borderColor: `${m.color}44` },
                                        m.textColor && { color: m.textColor },
                                    ]}
                                >
                                    {tag}
                                </Text>
                            ))}
                        </View>
                    )}
                </Card>
            );
        },
    },

    /* ============ HEALTH — FITNESS (CARDIO) ============ */
    {
        id: "fitness-cardio",
        domain: "fitness",
        label: "Cardio",
        isAvailable: (p) =>
            p?.type === "cardio" && (num(p.distance) > 0 || Boolean(p.duration)),
        title: (p) => p.text || "Cardio session",
        render: (p, ctx) => (
            <Card username={ctx.username}>
                <Text style={styles.captionStrong}>{p.text}</Text>
                <View style={styles.statGrid}>
                    {num(p.distance) > 0 && (
                        <Stat value={`${num(p.distance)} km`} label="distance" />
                    )}
                    {p.duration ? <Stat value={p.duration} label="time" /> : null}
                </View>
            </Card>
        ),
    },

    /* ============ HEALTH — FITNESS (STRENGTH) ============ */
    {
        id: "fitness-stats",
        domain: "fitness",
        label: "Summary",
        isAvailable: (p) => p?.type === "strength" && hasRealSets(p),
        title: (p) => p.text || "Workout complete",
        render: (p, ctx) => {
            const s = workoutStats(p);
            return (
                <Card username={ctx.username}>
                    <Text style={styles.captionStrong}>{p.text}</Text>
                    <View style={styles.statGrid}>
                        <Stat value={s.exerciseCount} label="# of exercises" />
                        <Stat value={s.setCount} label="# of all sets" />
                        <Stat value={`${s.volumeKg} kg`} label="total kg lifted" />
                        {p.activityDate && p.activityDate !== "9999-12-31" && (
                            <Stat value={p.activityDate.slice(5)} label="date" />
                        )}
                    </View>
                </Card>
            );
        },
    },
    {
        id: "fitness-exercises",
        domain: "fitness",
        label: "Exercises",
        isAvailable: (p) => p?.type === "strength" && hasRealSets(p),
        title: (p) => p.text || "Workout complete",
        render: (p, ctx) => (
            <Card username={ctx.username}>
                <Text style={styles.captionStrong}>{p.text}</Text>
                <View style={styles.exerciseList}>
                    {p.exercises.slice(0, 5).map((ex, i) => {
                        const sets = ex.sets ?? [];
                        const top = topWeight(ex);
                        return (
                            <Text key={`${ex.name}-${i}`} style={styles.exerciseRow}>
                                – {ex.name || "Exercise"}{" "}
                                <Text style={styles.muted}>
                                    ({plural(sets.length, "set", "sets")}
                                    {top > 0 ? ` · ${top} kg` : ""})
                                </Text>
                            </Text>
                        );
                    })}
                </View>
                {p.exercises.length > 5 && (
                    <Text style={styles.more}>+{p.exercises.length - 5} more</Text>
                )}
            </Card>
        ),
    },

    /* ============ PRODUCTIVITY — TODO ============ */
    {
        id: "todo-count",
        domain: "todo",
        label: "Tasks done",
        isAvailable: (p) => (p?.completedCount ?? 0) > 0,
        title: () => "I completed all my tasks for the day!",
        render: (p, ctx) => (
            <Card username={ctx.username}>
                <Text style={styles.caption}>Today I completed</Text>
                <Text style={styles.headline}>
                    {plural(p.completedCount, "task", "tasks")}!
                </Text>
            </Card>
        ),
    },
    {
        id: "todo-cleared",
        domain: "todo",
        label: "List cleared",
        isAvailable: (p) => (p?.completedCount ?? 0) > 0,
        title: () => "Cleared my whole to-do list today",
        render: (p, ctx) => (
            <Card username={ctx.username}>
                <Text style={styles.headlineSm}>To-do list</Text>
                <Text style={styles.headline}>cleared!</Text>
                <Text style={styles.caption}>
                    {plural(p.completedCount, "task", "tasks")} done
                </Text>
            </Card>
        ),
    },

    /* ============ FINANCE — BUDGET ============
         month-under     { kind, monthLabel, totalSpent, totalBudget }
         category-under  { kind, categoryLabel, categoryIcon, categoryColor,
                           spent, cap, monthLabel }                          */
    {
        id: "finance-month",
        domain: "finance",
        label: "Month",
        isAvailable: (p) => p?.kind === "month-under" && num(p.totalBudget) > 0,
        title: (p) => `Finished ${p.monthLabel} under budget`,
        render: (p, ctx) => {
            const used = (num(p.totalSpent) / num(p.totalBudget)) * 100;
            return (
                <Card username={ctx.username}>
                    <Text style={styles.captionStrong}>{p.monthLabel}</Text>
                    <Ring pct={used}>{Math.round(used)}%</Ring>
                    <Text style={styles.caption}>
                        {money(p.totalSpent)} of {money(p.totalBudget)} spent
                    </Text>
                </Card>
            );
        },
    },
    {
        id: "finance-category",
        domain: "finance",
        label: "Category",
        isAvailable: (p) => p?.kind === "category-under" && num(p.cap) > 0,
        title: (p) => `Kept ${p.categoryLabel} under budget this month`,
        render: (p, ctx) => {
            const used = (num(p.spent) / num(p.cap)) * 100;
            const tint = p.categoryColor
                ? { bg: `${p.categoryColor}22`, color: p.categoryColor }
                : null;
            return (
                <Card username={ctx.username} tint={tint}>
                    <Text style={styles.caption}>Under budget</Text>
                    <Text style={styles.headlineSm}>
                        {p.categoryIcon ? `${p.categoryIcon} ` : ""}
                        {p.categoryLabel}
                    </Text>
                    <Ring pct={used} stroke={p.categoryColor}>
                        {Math.round(used)}%
                    </Ring>
                    <Text style={styles.caption}>
                        {money(p.spent)} of {money(p.cap)}
                    </Text>
                </Card>
            );
        },
    },
];

/** Templates for a domain that the given payload can actually fill. */
export const templatesFor = (domain, payload) =>
    TEMPLATES.filter(
        (t) => t.domain === domain && (!t.isAvailable || t.isAvailable(payload))
    );

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id);

/* ---------- Firestore serialisation ---------- */
const SERIALISERS = {
    journal: (p) => ({
        key: p.key ?? null,
        moodId: p.moodId ?? null,
        journalText: p.journalText ?? "",
        emotions: (p.emotions ?? []).slice(0, 8),
    }),
    fitness: (p) => ({
        text: p.text ?? "",
        type: p.type ?? "strength",
        activityDate: p.activityDate ?? null,
        distance: num(p.distance),
        duration: p.duration ?? "",
        exercises: (p.exercises ?? []).slice(0, 12).map((ex) => ({
            name: ex.name ?? "",
            sets: (ex.sets ?? []).slice(0, 20).map((s) => ({
                weight: num(s.weight),
                reps: num(s.reps),
            })),
        })),
    }),
    todo: (p) => ({
        completedCount: num(p.completedCount),
        totalCount: num(p.totalCount),
        date: p.date ?? null,
    }),
    finance: (p) => ({
        kind: p.kind ?? "month-under",
        monthLabel: p.monthLabel ?? "",
        totalSpent: num(p.totalSpent),
        totalBudget: num(p.totalBudget),
        categoryLabel: p.categoryLabel ?? "",
        categoryIcon: p.categoryIcon ?? "",
        categoryColor: p.categoryColor ?? "",
        spent: num(p.spent),
        cap: num(p.cap),
    }),
};

/**
 * if an activity that was posted is edited later on the post won't update because the post
 * will act like a snapshot
 */
export const serialisePayload = (domain, payload) => {
    const fn = SERIALISERS[domain];
    if (!fn) throw new Error(`No payload serialiser for domain "${domain}"`);
    return fn(payload ?? {});
};

const styles = StyleSheet.create({
    card: {
        aspectRatio: 1,
        backgroundColor: colors.accentSoft,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        justifyContent: "space-between",
    },
    cardBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
    handle: { ...type.caption, color: colors.textMuted, textAlign: "right" },

    caption: { ...type.small, color: colors.textMuted, textAlign: "center" },
    captionStrong: {
        ...type.title,
        fontFamily: fonts.bold,
        color: colors.text,
        textAlign: "center",
    },
    quote: { ...type.body, fontFamily: fonts.medium, color: colors.text, textAlign: "center" },

    moodLabel: { ...type.h3, color: colors.text, textAlign: "center" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "center" },
    tag: {
        ...type.caption,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        overflow: "hidden",
    },

    statGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing.md,
    },
    stat: { alignItems: "center", minWidth: 72 },
    statValue: { ...type.h3, color: colors.text },
    statLabel: { ...type.caption, color: colors.textMuted, textAlign: "center" },

    exerciseList: { alignSelf: "stretch", gap: 2 },
    exerciseRow: { ...type.small, color: colors.text },
    muted: { color: colors.textMuted },
    more: { ...type.caption, color: colors.textMuted },

    headline: { ...type.h2, color: colors.text, textAlign: "center" },
    headlineSm: { ...type.h3, color: colors.text, textAlign: "center" },

    ringWrap: { width: 128, height: 128, alignItems: "center", justifyContent: "center" },
    ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    ringText: { ...type.h3, color: colors.text },
});
