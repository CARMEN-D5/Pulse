
// Consent is recorded in two places, deliberately:
//
//   AsyncStorage  — survives before there is a uid to write against, so the
//                   first-launch notice can be shown over Splash and answered
//                   by someone who has not signed up yet.
//   /users/{uid}  — the durable record. Follows the account rather than the
//                   device, so signing in on a second phone does not re-prompt,
//                   and so there is something to point at if anyone ever asks
//                   you to evidence that consent was obtained.
//
// The local copy is the cache; the profile copy is the source of truth.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { updateUserDoc } from "../firestore/users";

/**
 * Bump this whenever the notice text or the data inventory changes.
 * A stored record from an older version is treated as no consent, so the
 * user sees the current notice instead of being carried forward silently.
 */
export const CONSENT_VERSION = 1;

const LOCAL_KEY = "pulse.privacyConsent";

/**
 * Record shape (identical in both stores):
 * {
 *   version: 1,
 *   acceptedAt: "2026-08-27T02:35:00.000Z",
 *   analytics: false,        // optional, opt-in
 *   reminders: false,        // optional, opt-in
 *   sensitiveAnsweredAt: null | ISO string,
 *   health: false,           // APP 3.3 — health information
 *   spirituality: false,     // APP 3.3 — religious/spiritual beliefs
 * }
 */

export function emptyConsent() {
    return {
        version: CONSENT_VERSION,
        acceptedAt: null,
        analytics: false,
        reminders: false,
        sensitiveAnsweredAt: null,
        health: false,
        spirituality: false,
    };
}

/** True when the record exists and matches the notice version currently shipped. */
export function isCurrent(record) {
    return Boolean(record) && record.version === CONSENT_VERSION && Boolean(record.acceptedAt);
}

/**
 * True once the user has been asked the APP 3.3 question, whichever way they
 * answered. Declining is a valid answer and must not re-prompt on every launch.
 */
export function sensitiveAnswered(record) {
    return Boolean(record?.sensitiveAnsweredAt);
}

/* ---------------- local (pre-auth) ---------------- */

export async function readLocalConsent() {
    try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (!raw) return null;
        const record = JSON.parse(raw);
        return record?.version === CONSENT_VERSION ? record : null;
    } catch (err) {
        // Fail closed: an unreadable record means we ask again rather than assume.
        console.debug("[Pulse] readLocalConsent failed", err?.message);
        return null;
    }
}

export async function writeLocalConsent(record) {
    try {
        await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(record));
    } catch (err) {
        console.debug("[Pulse] writeLocalConsent failed", err?.message);
    }
    return record;
}

export async function clearLocalConsent() {
    try {
        await AsyncStorage.removeItem(LOCAL_KEY);
    } catch (err) {
        console.debug("[Pulse] clearLocalConsent failed", err?.message);
    }
}

/* ---------------- profile (post-auth) ---------------- */

/**
 * Persist the record onto /users/{uid}. `acceptedAt` is a client ISO string
 * rather than serverTimestamp() so the same object can round-trip through
 * AsyncStorage unchanged; updateUserDoc still stamps a server `updatedAt`.
 */
export async function writeProfileConsent(uid, record) {
    if (!uid) return { ok: false, error: "No uid" };
    return updateUserDoc(uid, { privacyConsent: record });
}

/** Pull the record off an already-fetched user doc. */
export function consentFromUserDoc(userDoc) {
    const record = userDoc?.privacyConsent;
    return record?.version === CONSENT_VERSION ? record : null;
}

/* ---------------- record builders ---------------- */

/** Answer to the first-launch APP 5 notice. */
export function acceptNotice({ analytics = false, reminders = false } = {}) {
    return {
        ...emptyConsent(),
        acceptedAt: new Date().toISOString(),
        analytics,
        reminders,
    };
}

/** Answer to the APP 3.3 sensitive-information question, either way. */
export function answerSensitive(record, { health = false, spirituality = false } = {}) {
    return {
        ...(record ?? emptyConsent()),
        sensitiveAnsweredAt: new Date().toISOString(),
        health,
        spirituality,
    };
}

/**
 * Called on sign-up and on sign-in: reconciles the device record with the
 * account record so the two agree.
 *
 * The profile wins when it exists, because it is the durable one — a user who
 * consented on their old phone should not be asked again on their new one.
 */
export async function syncConsent(uid, userDoc) {
    const fromProfile = consentFromUserDoc(userDoc);
    if (fromProfile) {
        await writeLocalConsent(fromProfile);
        return fromProfile;
    }

    const fromLocal = await readLocalConsent();
    if (isCurrent(fromLocal)) {
        // First sign-up on this device: carry the pre-auth answer onto the account.
        await writeProfileConsent(uid, fromLocal);
        return fromLocal;
    }

    return null;
}

/**
 * Update the optional toggles or the sensitive-domain toggles from Settings,
 * without re-showing either modal. Keeps consent withdrawable (APP 1.4).
 */
export async function patchConsent(uid, record, patch) {
    const next = { ...(record ?? emptyConsent()), ...patch };
    await writeLocalConsent(next);
    if (uid) await writeProfileConsent(uid, next);
    return next;
}