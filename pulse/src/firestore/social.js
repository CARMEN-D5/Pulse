// src/firestore/social.js
//
// Firestore helpers for the social-media feature: daily posts, likes,
// and comments.
//
// Data model (top-level collections so everyone can read them):
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
// Like/comment counts are computed on read from the sub-collection size
// rather than denormalized onto the post. That keeps the security rules
// simple (the post doc is only writable by its author) at the cost of an
// extra read per post. Fine for a uni-project scale of traffic.

import {
  collection,
  collectionGroup,
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

/** Update the reflection or image on an existing post. */
export async function updatePost(postId, patch) {
  try {
    const ref = doc(db, "posts", postId);
    await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    return { ok: true };
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

/** Most-recent N posts, across all users. */
export async function listFeed({ pageSize = 30 } = {}) {
  try {
    const snap = await getDocs(
      query(postsCol(), orderBy("createdAt", "desc"), limit(pageSize))
    );
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return { ok: true, data: out };
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

/** Returns `{ count, likedByMe }` in a single round trip. */
export async function getLikeSummary(postId, uid) {
  try {
    const [allSnap, mineSnap] = await Promise.all([
      getDocs(likesCol(postId)),
      uid ? getDoc(doc(db, "posts", postId, "likes", uid)) : Promise.resolve(null),
    ]);
    return {
      ok: true,
      data: {
        count: allSnap.size,
        likedByMe: !!mineSnap?.exists?.(),
      },
    };
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

/** List comments on a post, oldest first (so the conversation reads naturally). */
export async function listComments(postId) {
  try {
    const snap = await getDocs(
      query(commentsCol(postId), orderBy("createdAt", "asc"))
    );
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return { ok: true, data: out };
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

/** Count comments on a post (cheap if traffic is small). */
export async function getCommentCount(postId) {
  try {
    const snap = await getDocs(commentsCol(postId));
    return { ok: true, data: snap.size };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// Re-export collectionGroup so a future "all comments by me" view can use it.
export { collectionGroup };

// ---------------------------------------------------------------------------
// Real-time subscriptions
// ---------------------------------------------------------------------------
//
// Each helper returns an unsubscribe function — call it in your useEffect
// cleanup. New posts, likes and comments will then flow into the UI without
// the user having to refresh.

/** Live feed of the most-recent N posts. */
export function subscribeToFeed(callback, { pageSize = 30 } = {}) {
  const q = query(postsCol(), orderBy("createdAt", "desc"), limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      const out = [];
      snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
      callback(out);
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.debug("[Pulse] subscribeToFeed error", err?.code, err?.message);
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
