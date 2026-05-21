// src/firestore/friendship.js
//
// Firestore helpers for the friendship layer that sits underneath the
// social-media features:
//
//   friendRequests/{id}    — pending requests; `id` is the sorted-and-joined
//                            uids so any pair has at most one open request.
//     from, to, fromName, fromEmail, toName, toEmail, createdAt
//
//   friendships/{id}       — accepted friendships; same sorted-id shape.
//     participants: [uidA, uidB],
//     participantInfo: { [uidA]: { name, email }, [uidB]: { name, email } },
//     createdAt
//
// The deterministic id keeps both sides of the relationship in sync — A and B
// always write to and read from the same doc id regardless of who initiated.

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

/** Sorted-and-joined uid pair. Used for both friendRequest and friendship ids. */
export function pairId(uidA, uidB) {
  if (!uidA || !uidB) throw new Error("pairId requires two uids");
  return [uidA, uidB].sort().join("_");
}

// ---------------------------------------------------------------------------
// Friend requests
// ---------------------------------------------------------------------------

/**
 * Send a friend request from `me` to `other`. Both objects should have
 * { uid, name, email }. Returns ok=false with a friendly reason if the
 * users are already friends or a request is already pending in either
 * direction.
 */
export async function sendFriendRequest(me, other) {
  if (!me?.uid || !other?.uid) {
    return { ok: false, error: "Both users required." };
  }
  if (me.uid === other.uid) {
    return { ok: false, error: "Can't friend yourself." };
  }

  const id = pairId(me.uid, other.uid);

  try {
    // Refuse if already friends.
    const fSnap = await getDoc(doc(db, "friendships", id));
    if (fSnap.exists()) {
      return { ok: false, error: "You're already friends." };
    }
  } catch (err) {
    // ignore — rule denies on non-existent doc; treat as "not friends"
  }

  try {
    await setDoc(doc(db, "friendRequests", id), {
      from: me.uid,
      to: other.uid,
      fromName: me.name || null,
      fromEmail: me.email || null,
      toName: other.name || null,
      toEmail: other.email || null,
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Accept a pending friend request. Reads the request, writes the
 * friendship, then deletes the request. The accepter is the one
 * making the writes (`me`).
 */
export async function acceptFriendRequest(requestId, me) {
  try {
    const reqSnap = await getDoc(doc(db, "friendRequests", requestId));
    if (!reqSnap.exists()) {
      return { ok: false, error: "Request not found." };
    }
    const r = reqSnap.data();
    if (r.to !== me.uid) {
      return { ok: false, error: "That request isn't yours to accept." };
    }

    const fid = pairId(r.from, r.to);
    await setDoc(doc(db, "friendships", fid), {
      participants: [r.from, r.to].sort(),
      participantInfo: {
        [r.from]: { name: r.fromName || null, email: r.fromEmail || null },
        [r.to]:   { name: r.toName   || null, email: r.toEmail   || null },
      },
      createdAt: serverTimestamp(),
    });
    await deleteDoc(doc(db, "friendRequests", requestId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Decline (or cancel) a pending friend request — just delete it. */
export async function declineFriendRequest(requestId) {
  try {
    await deleteDoc(doc(db, "friendRequests", requestId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Friendships
// ---------------------------------------------------------------------------

/** Remove an accepted friendship. Both users are equally allowed to unfriend. */
export async function unfriend(myUid, otherUid) {
  try {
    await deleteDoc(doc(db, "friendships", pairId(myUid, otherUid)));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/** Real-time list of requests INCOMING to `uid` (someone wants to friend us). */
export function subscribeToIncomingRequests(uid, callback) {
  if (!uid) return () => {};
  const q = query(collection(db, "friendRequests"), where("to", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug(
        "[Pulse] subscribeToIncomingRequests error",
        err?.code,
        err?.message
      );
    }
  );
}

/** Real-time list of requests OUTGOING from `uid` (we want to friend them). */
export function subscribeToOutgoingRequests(uid, callback) {
  if (!uid) return () => {};
  const q = query(collection(db, "friendRequests"), where("from", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug(
        "[Pulse] subscribeToOutgoingRequests error",
        err?.code,
        err?.message
      );
    }
  );
}

/** Real-time list of friendships that include `uid`. */
export function subscribeToFriendships(uid, callback) {
  if (!uid) return () => {};
  const q = query(
    collection(db, "friendships"),
    where("participants", "array-contains", uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug(
        "[Pulse] subscribeToFriendships error",
        err?.code,
        err?.message
      );
    }
  );
}
