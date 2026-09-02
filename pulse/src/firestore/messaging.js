// src/firestore/messaging.js
//
// Firestore helpers for 1-on-1 direct messages.
//
// Data model:
//
//   conversations/{convId}
//     participants: [uidA, uidB]   (sorted alphabetically)
//     participantInfo: {           (so a thread list can show names without
//       [uidA]: { name, email },    extra lookups)
//       [uidB]: { name, email },
//     }
//     lastMessage: string?
//     lastMessageAt: timestamp?
//     createdAt
//
//   conversations/{convId}/messages/{msgId}
//     senderUid, text, createdAt
//
// `convId` is deterministic — sorted-and-joined uids — so the same pair of
// users always ends up with exactly one conversation document.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

// ---------------------------------------------------------------------------
// Conversation id
// ---------------------------------------------------------------------------

/** Deterministic id: smallerUid_largerUid */
export function conversationIdFor(uidA, uidB) {
  if (!uidA || !uidB) throw new Error("conversationIdFor requires two uids");
  return [uidA, uidB].sort().join("_");
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

const convsCol = () => collection(db, "conversations");

/**
 * Return the conversation between me and `otherUser`, creating it if needed.
 * `otherUser` should have at least { uid, name, email }.
 *
 * Note on the try/catch around `getDoc`: Firestore rules for the
 * /conversations/{convId} read predicate reference `resource.data.participants`,
 * which is undefined when the doc doesn't yet exist. The rules engine then
 * denies the read with "Missing or insufficient permissions" instead of
 * returning a "doc doesn't exist" snapshot. We treat that specific failure
 * as "doesn't exist yet" and fall through to the create branch.
 */
export async function getOrCreateConversation(me, otherUser) {
  if (!me?.uid || !otherUser?.uid) {
    return { ok: false, error: "Both users required." };
  }
  if (me.uid === otherUser.uid) {
    return { ok: false, error: "Can't message yourself." };
  }

  const convId = conversationIdFor(me.uid, otherUser.uid);
  const ref = doc(db, "conversations", convId);

  // Probe for an existing conversation. Either a real read error or a
  // "doesn't exist" snapshot both fall through to create — setDoc with
  // merge: true is idempotent so a doubly-created doc isn't a problem.
  let existing = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) existing = snap.data();
  } catch (err) {
    // Most likely permission-denied on a non-existent doc; ignore.
  }

  if (existing) {
    return { ok: true, data: { id: convId, ...existing } };
  }

  try {
    const participants = [me.uid, otherUser.uid].sort();
    const participantInfo = {
      [me.uid]: { name: me.name || null, email: me.email || null },
      [otherUser.uid]: {
        name: otherUser.name || null,
        email: otherUser.email || null,
      },
    };
    await setDoc(
      ref,
      {
        participants,
        participantInfo,
        lastMessage: null,
        lastMessageAt: null,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return {
      ok: true,
      data: {
        id: convId,
        participants,
        participantInfo,
        lastMessage: null,
        lastMessageAt: null,
      },
    };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messagesCol = (convId) =>
  collection(db, "conversations", convId, "messages");

/**
 * Send a message inside a conversation. Also bumps lastMessage,
 * lastMessageAt, and lastMessageSender on the parent conversation doc so
 * the inbox can show a preview and decide whether to render an unread dot.
 */
/**
 * Send a message. Text and image are both optional individually, but at
 * least one must be provided. The parent conversation doc's lastMessage
 * preview shows the text if present, otherwise "📷 Photo" — so the inbox
 * list always has something meaningful even for image-only messages.
 */
export async function sendMessage(convId, { senderUid, text, imageUrl, imagePath }) {
  if (!senderUid) return { ok: false, error: "Not signed in" };
  const trimmed = (text || "").trim();
  if (!trimmed && !imageUrl) {
    return { ok: false, error: "Message is empty." };
  }

  try {
    // Store null (not undefined) for the fields Firestore should persist as
    // absent — makes rules and reads easier to reason about.
    await addDoc(messagesCol(convId), {
      senderUid,
      text: trimmed || null,
      imageUrl: imageUrl || null,
      imagePath: imagePath || null,
      createdAt: serverTimestamp(),
    });
    const preview = trimmed
      ? trimmed.length > 80
        ? trimmed.slice(0, 80) + "…"
        : trimmed
      : "📷 Photo";
    await setDoc(
      doc(db, "conversations", convId),
      {
        lastMessage: preview,
        lastMessageAt: serverTimestamp(),
        lastMessageSender: senderUid,
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Mark a conversation as read by `uid`. Writes
 * `lastReadAt.{uid} = serverTimestamp()` so the inbox can compare it to
 * `lastMessageAt` and decide whether to show an unread dot.
 *
 * Safe to call repeatedly — `setDoc` with merge is idempotent.
 */
export async function markConversationRead(convId, uid) {
  if (!convId || !uid) return { ok: false, error: "Missing convId/uid" };
  try {
    await setDoc(
      doc(db, "conversations", convId),
      { lastReadAt: { [uid]: serverTimestamp() } },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Subscribe to the user's conversation list in real time. New conversations
 * and updates to lastMessage/lastMessageAt push instantly into the UI.
 */
export function subscribeToConversations(uid, callback) {
  if (!uid) return () => {};
  const q = query(convsCol(), where("participants", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      // Sort newest activity first. Doing it client-side avoids needing a
      // composite index on (participants, lastMessageAt).
      out.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || 0;
        return tb - ta;
      });
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug(
        "[Pulse] subscribeToConversations error",
        err?.code,
        err?.message
      );
    }
  );
}

/**
 * Subscribe to messages in a conversation in real time. Returns the
 * unsubscribe function — call it in your useEffect cleanup.
 */
export function subscribeToMessages(convId, callback, { pageSize = 100 } = {}) {
  const q = query(
    messagesCol(convId),
    orderBy("createdAt", "asc"),
    limit(pageSize)
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
      console.debug("[Pulse] subscribeToMessages error", err?.code, err?.message);
    }
  );
}
