/**
 * Pure logic for selecting daily missions + Firestore read/write helpers.
 * No React here — import this from both DailyMissions and MissionHistory.
 *
 * Firestore schema (per user):
 *
 *   users/{uid}/missions/daily          ← today's state + week metadata
 *     dayKey        "YYYY-MM-DD"
 *     weekKey       "YYYY-Www"
 *     fixedDomains  string[]            domains locked for the whole week
 *     weeklyUsed    string[]            mission texts used so far this week
 *     missions      Mission[]           today's 3 missions (with completed flag)
 *
 *   users/{uid}/missions/history/{YYYY-MM-DD}   ← one doc per past day
 *     dayKey        "YYYY-MM-DD"
 *     weekKey       "YYYY-Www"
 *     missions      Mission[]           snapshot of that day's missions
 */

import { db } from '../firebase';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    orderBy,
    query,
} from 'firebase/firestore';
import { MISSION_POOLS, ALL_DOMAINS } from './missionPools';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns "YYYY-Www" (ISO week) for a given Date. */
export function getWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Returns "YYYY-MM-DD" for a given Date. */
export function getDayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

// ─── Score analysis ───────────────────────────────────────────────────────────

/**
 * Analyses domain scores and returns which domains should be "fixed"
 * (appear every day) for the week.
 *
 * Rules:
 *   - If lowest is strictly lower than second → lowest is fixed.
 *   - If second is strictly lower than third  → second is also fixed.
 *   - If all scores are equal                 → no fixed domains (full random).
 *
 * THRESHOLD: minimum score gap to consider a domain "notably lower".
 * Currently 0 (any difference counts). Do NOT remove — pending team review.
 * To restore the original behaviour set THRESHOLD = 10.
 *
 * @param {object} domainScores  e.g. { spirituality: 80, finance: 40, … }
 * @returns {{ lowestDomain: string|null, secondLowestDomain: string|null }}
 */
export function analyseScores(domainScores) {
    const entries = ALL_DOMAINS
        .map(key => ({ key, score: domainScores?.[key] ?? 50 }))
        .sort((a, b) => a.score - b.score);

    const THRESHOLD = 0; // ← team discussion pending; may change to e.g. 10

    const [lowest, second, third] = entries;

    const hasLowest  = (second.score - lowest.score)  > THRESHOLD;
    const hasSecond  = hasLowest && (third.score - second.score) > THRESHOLD;

    return {
        lowestDomain:       hasLowest  ? lowest.key  : null,
        secondLowestDomain: hasSecond  ? second.key  : null,
    };
}

// ─── Random selection helpers ─────────────────────────────────────────────────

/** Pick `count` distinct random elements from `pool`, excluding `exclude`. */
function pickRandom(pool, count, exclude = []) {
    const available = pool.filter(item => !exclude.includes(item));
    const copy = [...available];
    const result = [];
    while (result.length < count && copy.length > 0) {
        const idx = Math.floor(Math.random() * copy.length);
        result.push(copy.splice(idx, 1)[0]);
    }
    return result;
}

/**
 * Pick one mission text from a domain's pool, preferring texts not yet used
 * this week. Falls back to the full pool if everything has been used.
 */
function pickMissionFromDomain(domainKey, usedThisWeek = []) {
    const pool = MISSION_POOLS[domainKey];
    const fresh = pool.filter(m => !usedThisWeek.includes(m));
    const source = fresh.length > 0 ? fresh : pool;
    return {
        domain: domainKey,
        text: source[Math.floor(Math.random() * source.length)],
    };
}

// ─── Core generator ───────────────────────────────────────────────────────────

/**
 * Generate today's 3 missions.
 *
 * @param {object}   domainScores   { spirituality, … }
 * @param {string[]} usedThisWeek   mission texts already issued this week
 * @param {string[]} fixedDomains   0-2 domain keys locked for the week
 * @returns {{ domain: string, text: string }[]}
 */
export function generateDailyMissions(domainScores, usedThisWeek = [], fixedDomains = []) {
    const missions     = [];
    const usedDomains  = [];

    // 1. Fixed-domain slots (lowest / second-lowest)
    for (const domain of fixedDomains) {
        missions.push(pickMissionFromDomain(domain, usedThisWeek));
        usedDomains.push(domain);
    }

    // 2. Fill remaining slots with random distinct domains
    const remaining = 3 - missions.length;
    if (remaining > 0) {
        const available     = ALL_DOMAINS.filter(d => !usedDomains.includes(d));
        const chosenDomains = pickRandom(available, remaining);
        for (const domain of chosenDomains) {
            missions.push(pickMissionFromDomain(domain, usedThisWeek));
        }
    }

    return missions;
}

// ─── Firestore: today's missions doc ─────────────────────────────────────────

const dailyRef = (uid) => doc(db, 'users', uid, 'missions', 'daily');

export async function loadDailyDoc(uid) {
    const snap = await getDoc(dailyRef(uid));
    return snap.exists() ? snap.data() : null;
}

export async function saveDailyDoc(uid, data) {
    await setDoc(dailyRef(uid), data, { merge: true });
}

// ─── Firestore: history ───────────────────────────────────────────────────────

const historyRef  = (uid, dayKey) =>
    doc(db, 'users', uid, 'missions', 'history', 'days', dayKey);
const historyCol  = (uid) =>
    collection(db, 'users', uid, 'missions', 'history', 'days');

/**
 * Archive today's missions into the history sub-collection.
 * Called automatically when a new day's missions are generated.
 */
export async function archiveDay(uid, dayKey, weekKey, missions) {
    // Only archive days that actually had missions
    if (!missions || missions.length === 0) return;
    await setDoc(historyRef(uid, dayKey), { dayKey, weekKey, missions }, { merge: false });
}

/**
 * Load all historical days for a user, sorted newest-first.
 * @returns {{ dayKey, weekKey, missions }[]}
 */
export async function loadHistory(uid) {
    const q = query(historyCol(uid), orderBy('dayKey', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
}

/** Returns the Monday-to-Sunday date range represented by an ISO week. */
export function getWeekRange(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}
