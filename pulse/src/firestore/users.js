// src/firestore/users.js
//
// Tiny helper around the /users/{uid} Firestore collection.
//
// This is the minimum viable profile document: it stores the fields we
// already have from Firebase Auth (displayName, email) plus timestamps so
// future features (streaks, balance scores, onboarding-quiz answers, etc.)
// have a natural home. Keep the shape narrow — broader profile data
// should land in its own sprint.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

/** Returns the DocumentReference for the given user's profile. */
function userRef(uid) {
  return doc(db, "users", uid);
}

/**
 * Create the user document if it doesn't exist yet, otherwise update
 * `updatedAt` so we can tell who's been active recently. Safe to call on
 * every sign-in — it only writes new fields on first run.
 */
export async function ensureUserDoc(firebaseUser) {
  if (!firebaseUser?.uid) return { ok: false, isNew: false, error: "No user" };

  try {
    const ref = userRef(firebaseUser.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        displayName: firebaseUser.displayName || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { ok: true, isNew: true };
    } else {
      await updateDoc(ref, { updatedAt: serverTimestamp() });
      return { ok: true, isNew: false };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug("[Pulse] ensureUserDoc failed", err?.code, err?.message);
    return { ok: false, error: err?.message };
  }
}

/** Fetch the user document (null if it hasn't been created yet). */
export async function getUserDoc(uid) {
  try {
    const snap = await getDoc(userRef(uid));
    return { ok: true, data: snap.exists() ? snap.data() : null };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Patch arbitrary fields on the user document, always bumping updatedAt. */
export async function updateUserDoc(uid, patch) {
  try {
    await updateDoc(userRef(uid), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Find a user by their exact email address.
 *
 * Used by the social-media "start a new conversation" search box. Returns
 * the first matching user doc or null. Email is the natural search key
 * because each Auth user has a unique email (Firebase Auth enforces this).
 */
export async function searchUserByEmail(email) {
  if (!email) return { ok: false, error: "Enter an email" };
  const cleaned = email.trim().toLowerCase();
  try {
    const snap = await getDocs(
      query(
        collection(db, "users"),
        where("email", "==", cleaned),
        limit(1)
      )
    );
    if (snap.empty) return { ok: true, data: null };
    const d = snap.docs[0];
    return { ok: true, data: { uid: d.id, ...d.data() } };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}
