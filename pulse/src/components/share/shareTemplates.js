import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { DOMAIN_META, MoodFace, MOODS } from "./adapters";
import { colors, fonts, radius, spacing, type } from "../../theme";

/**
 * share card templates
 *
 * each template:
 *   id          unique key, stored on the post as `templateId`
 *   domain      journal | fitness | todo | finance | missions
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
 *   missions  { dayKey, completedCount, totalCount,
 *               missions: [{ domain, text, completed }] }
 *             `missions` carries all three of the day's missions, not just
 *             the finished ones — the list template filters. Keeping the
 *             whole set means a post shared at 2/3 still knows there were 3.
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
 *   finance   { kind: "month-under" | "category-under"
 *                   | "savings-milestone" | "savings-goal", … }
 *             see the finance section for each kind's fields
 *
 * ADDING A DOMAIN — read this before you do
 *
 *   A template in TEMPLATES is only half the job. `serialisePayload` throws
 *   on a domain with no entry in SERIALISERS, and it is called inside
 *   SharingPromptPopUp's handlePost — so a missing serialiser does not fail
 *   at build time, and does not fail in the carousel. It fails at the moment
 *   someone taps Post. Add both, together.
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

/** Tint trio built from a saving plan's colour, matching the mood tint shape. */
const planTint = (color) =>
    color ? { bg: `${color}1a`, color, textColor: colors.text } : null;

/**
 * Same defensive reasoning as UNKNOWN_MOOD. DailyMissions falls back to this
 * shape when DOMAIN_META has no entry, and the feed renders whatever was
 * saved with no isAvailable gate — so a mission stored under a domain key
 * that has since been renamed must not take the feed down on `meta.icon`.
 */
const UNKNOWN_DOMAIN = { label: "Mission", icon: "⭐", color: "#8a8a96" };

const domainMeta = (key) => DOMAIN_META?.[key] ?? UNKNOWN_DOMAIN;

const doneMissions = (p) => (p?.missions ?? []).filter((m) => m?.completed);

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

    /* ============ DAILY MISSIONS ============
         { dayKey, completedCount, totalCount,
           missions: [{ domain, text, completed }] }

       Auto-prompted from DailyMissions only when the last of the day's three
       is ticked, never per mission — see the useAutoSharePrompt call there.
       The manual ShareButton still works at 1/3 or 2/3, which is why the list
       template gates on completedCount rather than on a full house.          */
    {
        id: "missions-complete",
        domain: "missions",
        label: "All done",
        isAvailable: (p) =>
            num(p?.completedCount) > 0 && num(p?.completedCount) >= num(p?.totalCount),
        title: () => "All my daily missions done!",
        render: (p, ctx) => (
            <Card username={ctx.username}>
                <Text style={styles.caption}>Today's missions</Text>
                <Text style={styles.headline}>
                    {num(p.completedCount)}/{num(p.totalCount)} complete
                </Text>
                <View style={styles.tags}>
                    {(p.missions ?? []).map((m, i) => {
                        const meta = domainMeta(m.domain);
                        return (
                            <Text
                                key={`${m.domain}-${i}`}
                                style={[styles.tag, { borderColor: `${meta.color}44`, color: meta.color }]}
                            >
                                {meta.icon} {meta.label}
                            </Text>
                        );
                    })}
                </View>
            </Card>
        ),
    },
    {
        id: "missions-list",
        domain: "missions",
        label: "Missions",
        isAvailable: (p) => doneMissions(p).length > 0,
        title: (p) => {
            const n = doneMissions(p).length;
            return n >= num(p?.totalCount)
                ? "Finished every mission today"
                : `${plural(n, "mission", "missions")} down today`;
        },
        render: (p, ctx) => {
            const done = doneMissions(p);
            return (
                <Card username={ctx.username}>
                    <Text style={styles.captionStrong}>
                        {plural(done.length, "mission", "missions")} done
                    </Text>
                    <View style={styles.exerciseList}>
                        {done.slice(0, 3).map((m, i) => {
                            const meta = domainMeta(m.domain);
                            return (
                                <Text key={`${m.domain}-${i}`} style={styles.exerciseRow}>
                                    <Text style={{ color: meta.color }}>{meta.icon}</Text> {m.text}
                                </Text>
                            );
                        })}
                    </View>
                </Card>
            );
        },
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

    /* ============ FINANCE — SAVING PLANS ============
         savings-goal       { kind, planName, planIcon, planColor,
                              savedAmount, targetAmount, actualProgress }
         savings-milestone  same fields plus { milestone }

       These sit in the `finance` domain rather than one of their own because
       that is what the design already assumed — see the finance line in
       SharePromptProvider's useAutoSharePrompt docstring. Payloads come from
       savingsSharePayload() in pages/savingMilestones.js, which is fed by the
       same getSavingProgressEvent() that drives SavingMilestoneModal.        */
    {
        id: "finance-savings-goal",
        domain: "finance",
        label: "Goal reached",
        isAvailable: (p) => p?.kind === "savings-goal" && num(p.targetAmount) > 0,
        title: (p) => `I reached my saving goal for ${p.planName}`,
        render: (p, ctx) => (
            <Card username={ctx.username} tint={planTint(p.planColor)}>
                <Text style={styles.caption}>Saving goal reached</Text>
                <Text style={styles.headlineSm}>
                    {p.planIcon ? `${p.planIcon} ` : ""}
                    {p.planName}
                </Text>
                <Ring pct={100} stroke={p.planColor}>
                    100%
                </Ring>
                <Text style={styles.caption}>
                    {money(p.savedAmount)} of {money(p.targetAmount)} saved
                </Text>
            </Card>
        ),
    },
    {
        id: "finance-savings-milestone",
        domain: "finance",
        label: "Progress",
        // actualProgress, not milestone: a payload rebuilt from an older post
        // may have lost the milestone field, and the ring only needs progress.
        isAvailable: (p) =>
            p?.kind === "savings-milestone" &&
            num(p.targetAmount) > 0 &&
            num(p.actualProgress) > 0,
        title: (p) => `${num(p.actualProgress)}% of the way to ${p.planName}`,
        render: (p, ctx) => (
            <Card username={ctx.username} tint={planTint(p.planColor)}>
                <Text style={styles.caption}>Saving towards</Text>
                <Text style={styles.headlineSm}>
                    {p.planIcon ? `${p.planIcon} ` : ""}
                    {p.planName}
                </Text>
                <Ring pct={num(p.actualProgress)} stroke={p.planColor}>
                    {num(p.actualProgress)}%
                </Ring>
                <Text style={styles.caption}>
                    {money(p.savedAmount)} of {money(p.targetAmount)}
                </Text>
            </Card>
        ),
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
    missions: (p) => ({
        dayKey: p.dayKey ?? null,
        completedCount: num(p.completedCount),
        totalCount: num(p.totalCount),
        missions: (p.missions ?? []).slice(0, 5).map((m) => ({
            domain: m.domain ?? "",
            text: m.text ?? "",
            completed: Boolean(m.completed),
        })),
    }),
    finance: (p) => ({
        kind: p.kind ?? "month-under",
        // budget
        monthLabel: p.monthLabel ?? "",
        totalSpent: num(p.totalSpent),
        totalBudget: num(p.totalBudget),
        categoryLabel: p.categoryLabel ?? "",
        categoryIcon: p.categoryIcon ?? "",
        categoryColor: p.categoryColor ?? "",
        spent: num(p.spent),
        cap: num(p.cap),
        // saving plans. Every field is written on every finance post rather
        // than conditionally, so the feed never has to guard for a missing
        // key when rendering an older post.
        planName: p.planName ?? "",
        planIcon: p.planIcon ?? "",
        planColor: p.planColor ?? "",
        savedAmount: num(p.savedAmount),
        targetAmount: num(p.targetAmount),
        actualProgress: num(p.actualProgress),
        milestone: num(p.milestone),
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