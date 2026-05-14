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
 */
export async function getOrCreateConversation(me, otherUser) {
  if (!me?.uid || !otherUser?.uid) {
    return { ok: false, error: "Both users required." };
  }
  if (me.uid === otherUser.uid) {
    return { ok: false, error: "Can't message yourself." };
  }

  try {
    const convId = conversationIdFor(me.uid, otherUser.uid);
    const ref = doc(db, "conversations", convId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const participants = [me.uid, otherUser.uid].sort();
      const participantInfo = {
        [me.uid]: { name: me.name || null, email: me.email || null },
        [otherUser.uid]: {
          name: otherUser.name || null,
          email: otherUser.email || null,
        },
      };
      await setDoc(ref, {
        participants,
        participantInfo,
        lastMessage: null,
        lastMessageAt: null,
        createdAt: serverTimestamp(),
      });
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
    }
    return { ok: true, data: { id: convId, ...snap.data() } };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** All conversations involving `uid`, newest activity first. */
export async function listConversations(uid) {
  if (!uid) return { ok: false, error: "Not signed in" };
  try {
    const snap = await getDocs(
      query(
        convsCol(),
        where("participants", "array-contains", uid),
        orderBy("lastMessageAt", "desc")
      )
    );
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return { ok: true, data: out };
  } catch (err) {
    // The above query needs an index on (participants, lastMessageAt).
    // Firestore returns a friendly URL to create it on first failure;
    // fall back to an in-memory sort so dev still works without it.
    try {
      const snap = await getDocs(
        query(convsCol(), where("participants", "array-contains", uid))
      );
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      out.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis?.() || 0;
        const tb = b.lastMessageAt?.toMillis?.() || 0;
        return tb - ta;
      });
      return { ok: true, data: out };
    } catch (err2) {
      return { ok: false, error: err2?.message };
    }
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const messagesCol = (convId) =>
  collection(db, "conversations", convId, "messages");

/**
 * Send a message inside a conversation. Also bumps lastMessage/lastMessageAt
 * on the parent conversation doc so the inbox list can show a preview.
 */
export async function sendMessage(convId, { senderUid, text }) {
  if (!senderUid) return { ok: false, error: "Not signed in" };
  if (!text?.trim()) return { ok: false, error: "Message is empty." };

  try {
    const trimmed = text.trim();
    await addDoc(messagesCol(convId), {
      senderUid,
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, "conversations", convId),
      {
        lastMessage: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
        lastMessageAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
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
