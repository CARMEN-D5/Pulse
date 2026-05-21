// src/firestore/social.js
//
// Firestore helpers for the social-media feature: daily posts, likes,
// and comments. All real-time via onSnapshot subscriptions.
//
// Data model (top-level collections; visibility is enforced by rules
// based on the friendships collection):
//
//   posts/{postId}
//     authorUid, authorName, imageUrl, imagePath?, reflection,
//     dayKey ("YYYY-MM-DD"), createdAt
//
//   posts/{postId}/likes/{uid}        — existence == liked
//     createdAt
//
//   posts/{postId}/comments/{commentId}
//     authorUid, authorName, text, createdAt
//
// Like/comment counts are derived from the subcollection size in the
// live snapshot, so they update without a refresh and without an extra
// read on each render.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

// ---------------------------------------------------------------------------
// Day key helper
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" in the user's local time — used to enforce one post per day. */
export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const postsCol = () => collection(db, "posts");

/**
 * Create a new post. Validates that the author hasn't already posted today.
 * `imagePath` is the Storage path so the image can be cleaned up on delete.
 */
export async function createPost({
  authorUid,
  authorName,
  imageUrl,
  imagePath,
  reflection,
}) {
  if (!authorUid) return { ok: false, error: "Not signed in" };
  if (!reflection?.trim()) {
    return { ok: false, error: "Add a few words about what you did." };
  }

  try {
    const dayKey = todayKey();

    // Enforce one-per-day. Two clients racing could still both pass; that's
    // acceptable for a uni project — the worst case is a duplicate post.
    const existing = await getDocs(
      query(
        postsCol(),
        where("authorUid", "==", authorUid),
        where("dayKey", "==", dayKey),
        limit(1)
      )
    );
    if (!existing.empty) {
      return {
        ok: false,
        error: "You've already posted today — edit your existing post instead.",
      };
    }

    const ref = await addDoc(postsCol(), {
      authorUid,
      authorName: authorName || "Someone",
      imageUrl: imageUrl || null,
      imagePath: imagePath || null,
      reflection: reflection.trim(),
      dayKey,
      createdAt: serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Delete a post. The caller should clean up the Storage image first. */
export async function deletePost(postId) {
  try {
    await deleteDoc(doc(db, "posts", postId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** This user's post for today, or null. */
export async function getMyTodayPost(uid) {
  if (!uid) return { ok: false, error: "Not signed in" };
  try {
    const snap = await getDocs(
      query(
        postsCol(),
        where("authorUid", "==", uid),
        where("dayKey", "==", todayKey()),
        limit(1)
      )
    );
    if (snap.empty) return { ok: true, data: null };
    const d = snap.docs[0];
    return { ok: true, data: { id: d.id, ...d.data() } };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

const likesCol = (postId) => collection(db, "posts", postId, "likes");

/** Toggle whether `uid` likes `postId`. Returns the new boolean state. */
export async function toggleLike(postId, uid) {
  if (!uid) return { ok: false, error: "Not signed in" };
  try {
    const ref = doc(db, "posts", postId, "likes", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await deleteDoc(ref);
      return { ok: true, liked: false };
    } else {
      await setDoc(ref, { createdAt: serverTimestamp() });
      return { ok: true, liked: true };
    }
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const commentsCol = (postId) => collection(db, "posts", postId, "comments");

/** Add a comment to a post. */
export async function addComment(postId, { authorUid, authorName, text }) {
  if (!authorUid) return { ok: false, error: "Not signed in" };
  if (!text?.trim()) return { ok: false, error: "Comment can't be empty." };
  try {
    const ref = await addDoc(commentsCol(postId), {
      authorUid,
      authorName: authorName || "Someone",
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Delete a comment. Rules enforce that only the comment author can do this. */
export async function deleteComment(postId, commentId) {
  try {
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Real-time subscriptions
// ---------------------------------------------------------------------------
//
// Each helper returns an unsubscribe function — call it in your useEffect
// cleanup. New posts, likes and comments will then flow into the UI without
// the user having to refresh.

/**
 * Build the friends-only feed query.
 *
 * Firestore's `in` operator allows up to 30 values, which comfortably
 * covers a uni-student-scale friend list. If a user ever exceeds 30
 * friends we'd need to chunk this into multiple queries and merge.
 */
function buildFeedQuery(authorUids, pageSize) {
  const slice = authorUids.slice(0, 30);
  // Single-author special case: `==` is cheaper than `in` of length 1.
  if (slice.length === 1) {
    return query(
      postsCol(),
      where("authorUid", "==", slice[0]),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
  }
  return query(
    postsCol(),
    where("authorUid", "in", slice),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
}

/**
 * Live feed of the most-recent N posts authored by the given uids
 * (typically [self, ...friendUids]). Returns a no-op unsubscribe if
 * the list is empty.
 */
export function subscribeToFeed(authorUids, callback, { pageSize = 30 } = {}) {
  if (!Array.isArray(authorUids) || authorUids.length === 0) {
    // No authors to read from — return [] and a no-op cleanup.
    callback({ posts: [], error: null });
    return () => {};
  }
  return onSnapshot(
    buildFeedQuery(authorUids, pageSize),
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback({ posts: out, error: null });
    },
    (err) => {
      // Surface the error to the UI so the user can see why the feed is
      // empty. Common cases:
      //   permission-denied      → Firestore rules blocked the read
      //   failed-precondition    → missing composite index (the message
      //                            includes a URL to auto-create it)
      // eslint-disable-next-line no-console
      console.error("[Pulse] subscribeToFeed error", err?.code, err?.message);
      callback({
        posts: [],
        error: { code: err?.code, message: err?.message },
      });
    }
  );
}

/**
 * Live like summary for a post — `{ count, likedByMe }`.
 * `uid` may be null/undefined for signed-out users (likedByMe will be false).
 */
export function subscribeToLikes(postId, uid, callback) {
  return onSnapshot(
    likesCol(postId),
    (snap) => {
      callback({
        count: snap.size,
        likedByMe: uid ? snap.docs.some((d) => d.id === uid) : false,
      });
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug("[Pulse] subscribeToLikes error", err?.code, err?.message);
    }
  );
}

/** Live comments list for a post, oldest first. */
export function subscribeToComments(postId, callback) {
  const q = query(commentsCol(postId), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug("[Pulse] subscribeToComments error", err?.code, err?.message);
    }
  );
}
