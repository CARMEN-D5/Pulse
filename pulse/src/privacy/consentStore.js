import AsyncStorage from "@react-native-async-storage/async-storage";

import { updateUserDoc } from "../firestore/users";

/**
 * Bump when the notice text or the data inventory changes. Both gates check
 * it, so a bump re-notifies and re-asks.
 */
export const CONSENT_VERSION = 1;

const LOCAL_KEY = "pulse.privacyConsent";

/**
 * {
 *   version: 1,
 *   noticeAcknowledgedAt: "2026-08-27T..." | null,   // device
 *   acceptedAt:           "2026-08-27T..." | null,   // account
 *   analytics: false,
 *   reminders: false,
 *   sensitiveConsent: true, // APP 3.3 — health + spiritual entries
 * }
 */
export function emptyConsent() {
    return {
        version: CONSENT_VERSION,
        noticeAcknowledgedAt: null,
        acceptedAt: null,
        analytics: false,
        reminders: false,
        sensitiveConsent: false,
    };
}

/** Device has seen the current version of the collection notice. */
export function noticeAcknowledged(record) {
    return Boolean(record) && record.version === CONSENT_VERSION && Boolean(record.noticeAcknowledgedAt);
}

/** Account has a current consent record — the gate that gets its own view. */
export function accountConsented(record) {
    return Boolean(record) && record.version === CONSENT_VERSION && Boolean(record.acceptedAt);
}

/* ---------------- local (device) ---------------- */

export async function readLocalConsent() {
    try {
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (!raw) return null;
        const record = JSON.parse(raw);
        return record?.version === CONSENT_VERSION ? record : null;
    } catch (err) {
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

/**
 * Drops the ACCOUNT half of the local cache on logout, keeping the device's
 * notice acknowledgement. This is what stops the modal reappearing on the
 * logged-out splash screen while still making sure the next person to sign up
 * hits their own account-level consent step.
 */
export async function clearAccountConsent() {
    const current = await readLocalConsent();
    const next = {
        ...emptyConsent(),
        noticeAcknowledgedAt: current?.noticeAcknowledgedAt ?? null,
    };
    await writeLocalConsent(next);
    return next;
}

/* ---------------- profile (account) ---------------- */

export async function writeProfileConsent(uid, record) {
    if (!uid) return { ok: false, error: "No uid" };
    return updateUserDoc(uid, { privacyConsent: record });
}

export function consentFromUserDoc(userDoc) {
    const record = userDoc?.privacyConsent;
    return record?.version === CONSENT_VERSION ? record : null;
}

/* ---------------- record builders ---------------- */

/** Answer to the first-launch APP 5 notice. Device-level only. */
export function acknowledgeNotice(record) {
    return {
        ...(record ?? emptyConsent()),
        version: CONSENT_VERSION,
        noticeAcknowledgedAt: new Date().toISOString(),
    };
}

/**
 * Answer to the account-level consent step.
 *
 * `sensitiveConsent` is set true rather than being a user toggle: health and
 * spirituality are two of the five domains and are not separable from the
 * product, so the consent screen names them and "Continue" is the agreement.
 * The flag is still written because APP 3.3 consent you cannot evidence is
 * worth very little — this is the record that it was given, and when.
 */
export function acceptAccountConsent(record, choices = {}) {
    const { analytics = false, reminders = false } = choices;
    return {
        ...(record ?? emptyConsent()),
        version: CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        analytics,
        reminders,
        sensitiveConsent: true,
    };
}

/**
 * Reconcile device and account records on sign-in.
 *
 * The profile wins for the account half — someone who consented on their old
 * phone is not asked again on their new one. The device's notice
 * acknowledgement is preserved either way.
 */
export async function syncConsent(uid, userDoc) {
    const local = await readLocalConsent();
    const fromProfile = consentFromUserDoc(userDoc);

    if (fromProfile) {
        const merged = {
            ...fromProfile,
            noticeAcknowledgedAt:
                local?.noticeAcknowledgedAt ?? fromProfile.noticeAcknowledgedAt ?? null,
        };
        await writeLocalConsent(merged);
        return merged;
    }

    // No account record yet. Keep whatever the device knows, but do NOT promote
    // a previous user's account answers onto this uid — accountConsented() stays
    // false, so registration routes through the consent view.
    const carried = {
        ...emptyConsent(),
        noticeAcknowledgedAt: local?.noticeAcknowledgedAt ?? null,
    };
    await writeLocalConsent(carried);
    return carried;
}

/**
 * Update the optional toggles from Settings without re-showing either gate.
 * Keeps consent as easy to withdraw as it was to give (APP 1.4). Note this
 * covers analytics and reminders only — the sensitive-information consent is
 * withdrawn by deleting the account, since those domains are the product.
 */
export async function patchConsent(uid, record, patch) {
    const next = { ...(record ?? emptyConsent()), ...patch };
    await writeLocalConsent(next);
    if (uid) await writeProfileConsent(uid, next);
    return next;
}