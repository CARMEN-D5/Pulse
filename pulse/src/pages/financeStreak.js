/**
 * Finance streak * for the streak to be continued, there must be at least one logged each day.
 * for the streak to be broken, the user will need to miss TWO consecutive days.
 * one day will be allowed to be missed, so that the system is not too cruel.
 * user is also informed of the one day grace period. */

import { dayKey } from "../firestore/finance";

/**
 * Days below this are not offered as a share card.
 * Keep in step with the finance-streak isAvailable in shareTemplates.js.
 */
export const MIN_SHAREABLE_STREAK = 2;

/** How many consecutive empty days are forgiven before the run ends. */
export const STREAK_GRACE_DAYS = 1;

/** How far back to look. Bounds the loop and the Firestore read. */
export const STREAK_WINDOW_DAYS = 400;

/** Firestore Timestamp, Date or ISO string -> Date. */
function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function shiftDays(date, delta) {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    return next;
}

/**
 * @param {Array} expenses  expense docs, any order, each with a `date`
 * @param {Date}  today     injectable for tests
 * @returns {{ days: number, since: string|null, daysTracked: number }}
 *   days         length of the current run
 *   since        dayKey the run started on, or null
 *   daysTracked  distinct days logged anywhere in the window
 */
export function computeLoggingStreak(expenses = [], { today = new Date() } = {}) {
    const logged = new Set();
    for (const e of expenses) {
        const d = toDate(e?.date);
        if (d) logged.add(dayKey(d));
    }

    if (logged.size === 0) return { days: 0, since: null, daysTracked: 0 };

    let cursor = new Date(today);

    // An empty today is "not yet", not "missed" — start from yesterday instead
    // of spending the grace allowance on a day that has not finished.
    if (!logged.has(dayKey(cursor))) cursor = shiftDays(cursor, -1);

    let days = 0;
    let missed = 0;
    let since = null;

    for (let i = 0; i < STREAK_WINDOW_DAYS; i += 1) {
        const key = dayKey(cursor);
        if (logged.has(key)) {
            days += 1;
            missed = 0;
            since = key;
        } else {
            missed += 1;
            if (missed > STREAK_GRACE_DAYS) break;
        }
        cursor = shiftDays(cursor, -1);
    }

    return { days, since, daysTracked: logged.size };
}

/** "12 Aug" from a dayKey, for the card's subtitle. Null-safe. */
export function formatStreakSince(dayKeyString) {
    if (!dayKeyString) return "";
    const d = new Date(`${dayKeyString}T12:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}