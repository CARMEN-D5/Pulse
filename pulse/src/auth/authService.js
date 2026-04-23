// src/auth/authService.js
//
// Thin wrapper around Firebase Auth so the rest of the app only imports
// from here. Every function returns `{ ok: boolean, error?: string, user?: ... }`
// which keeps the React components simple and framework-agnostic.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../firebase";
import { ensureUserDoc } from "../firestore/users";

/**
 * Convert a Firebase Auth error into a user-friendly message.
 * Firebase error codes are documented at
 * https://firebase.google.com/docs/auth/admin/errors.
 */
function friendlyError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}

/** Sign up a new user with email/password and set their display name. */
export async function signUp({ name, email, password }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }
    // Create the /users/{uid} profile document.
    // Pass a fresh-shaped object because updateProfile doesn't mutate
    // the cred.user reference's displayName until the next refresh.
    await ensureUserDoc({
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name || cred.user.displayName || null,
    });
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Log in with email + password. */
export async function logIn({ email, password }) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Send a password-reset email. Always resolves ok to avoid leaking which
 *  addresses are registered — surface errors via the console instead. */
export async function resetPassword({ email }) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug("[Pulse] password reset error", err?.code, err?.message);
    return { ok: true }; // don't leak registration state to the UI
  }
}

/** Sign out the current user. */
export async function logOut() {
  try {
    await signOut(auth);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function suitable for React's useEffect cleanup.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
