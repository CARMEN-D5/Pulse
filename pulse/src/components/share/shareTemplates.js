import React from "react";
import { MoodFace, MOODS } from "./adapters";

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
 */
const Card = ({ children, username, tint }) => (
    <div
        className="sp-card"
        style={
            tint
                ? {
                    background: tint.bg,
                    border: `1px solid ${tint.color}33`,
                    color: tint.textColor ?? undefined,
                }
                : undefined
        }
    >
        <div className="sp-card__body">{children}</div>
        <div className="sp-card__handle">@{username ?? "username"}</div>
    </div>
);

const Stat = ({ value, label }) => (
    <div className="sp-stat">
        <div className="sp-stat__value">{value}</div>
        <div className="sp-stat__label">{label}</div>
    </div>
);

const Ring = ({ pct, children, stroke }) => {
    const R = 52;
    const C = 2 * Math.PI * R;
    const clamped = Math.max(0, Math.min(100, pct));
    return (
        <svg className="sp-ring" viewBox="0 0 128 128" role="img"
             aria-label={`${Math.round(clamped)} percent`}>
            <circle className="sp-ring__track" cx="64" cy="64" r={R} />
            <circle
                className="sp-ring__fill"
                cx="64" cy="64" r={R}
                style={stroke ? { stroke } : undefined}
                strokeDasharray={C}
                strokeDashoffset={C - (C * clamped) / 100}
            />
            <text className="sp-ring__text" x="64" y="70">
                {children}
            </text>
        </svg>
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
                <p className="sp-quote">“{p.journalText}”</p>
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
                    <div className="sp-card__caption">Today I'm feeling</div>
                    <MoodFace moodId={p.moodId} size={84} selected />
                    <div className="sp-mood__label">{m.label}</div>
                    {p.emotions?.length > 0 && (
                        <div className="sp-tags">
                            {p.emotions.slice(0, 4).map((tag) => (
                                <span
                                    className="sp-tag"
                                    key={tag}
                                    style={{ border: `1px solid ${m.color}44`, color: m.textColor }}
                                >
                  {tag}
                </span>
                            ))}
                        </div>
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
                <div className="sp-card__caption sp-card__caption--strong">{p.text}</div>
                <div className="sp-stat-grid">
                    {num(p.distance) > 0 && (
                        <Stat value={`${num(p.distance)} km`} label="distance" />
                    )}
                    {p.duration && <Stat value={p.duration} label="time" />}
                </div>
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
                    <div className="sp-card__caption sp-card__caption--strong">
                        {p.text}
                    </div>
                    <div className="sp-stat-grid">
                        <Stat value={s.exerciseCount} label="# of exercises" />
                        <Stat value={s.setCount} label="# of all sets" />
                        <Stat value={`${s.volumeKg} kg`} label="total kg lifted" />
                        {p.activityDate && p.activityDate !== "9999-12-31" && (
                            <Stat value={p.activityDate.slice(5)} label="date" />
                        )}
                    </div>
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
                <div className="sp-card__caption sp-card__caption--strong">{p.text}</div>
                <ul className="sp-exercise-list">
                    {p.exercises.slice(0, 5).map((ex, i) => {
                        const sets = ex.sets ?? [];
                        const top = topWeight(ex);
                        return (
                            <li key={`${ex.name}-${i}`}>
                                <span className="sp-dash">–</span> {ex.name || "Exercise"}{" "}
                                <span className="sp-muted">
                  ({plural(sets.length, "set", "sets")}
                                    {top > 0 ? ` · ${top} kg` : ""})
                </span>
                            </li>
                        );
                    })}
                </ul>
                {p.exercises.length > 5 && (
                    <div className="sp-more">+{p.exercises.length - 5} more</div>
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
                <div className="sp-card__caption">Today I completed</div>
                <div className="sp-headline">
                    {plural(p.completedCount, "task", "tasks")}!
                </div>
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
                <div className="sp-headline sp-headline--sm">To-do list</div>
                <div className="sp-headline">cleared!</div>
                <div className="sp-card__caption">
                    {plural(p.completedCount, "task", "tasks")} done
                </div>
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
                    <div className="sp-card__caption sp-card__caption--strong">
                        {p.monthLabel}
                    </div>
                    <Ring pct={used}>{Math.round(used)}%</Ring>
                    <div className="sp-card__caption">
                        {money(p.totalSpent)} of {money(p.totalBudget)} spent
                    </div>
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
                ? { bg: p.categoryColor + "22", color: p.categoryColor }
                : null;
            return (
                <Card username={ctx.username} tint={tint}>
                    <div className="sp-card__caption">Under budget</div>
                    <div className="sp-headline sp-headline--sm">
                        {p.categoryIcon ? `${p.categoryIcon} ` : ""}
                        {p.categoryLabel}
                    </div>
                    <Ring pct={used} stroke={p.categoryColor}>
                        {Math.round(used)}%
                    </Ring>
                    <div className="sp-card__caption">
                        {money(p.spent)} of {money(p.cap)}
                    </div>
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