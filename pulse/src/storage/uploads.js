// src/storage/uploads.js
//
// Thin wrapper around Firebase Storage for the social-media branch. Right now
// the only upload type is "post image" (the picture half of the daily 2-slide
// post). Other upload types (avatars, message attachments) can sit alongside.

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { storage } from "../firebase";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Pick a reasonable file extension from a File's type/name. */
function extFor(file) {
  const t = file?.type || "";
  if (t.startsWith("image/")) return t.split("/")[1].replace("jpeg", "jpg");
  const m = (file?.name || "").match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}

/**
 * Upload a post image to Firebase Storage and return a public download URL.
 *
 * Storage path: `/posts/{uid}/{timestamp}-{rand}.{ext}` — keeps each user's
 * uploads in their own folder which makes the Storage rules trivial.
 */
export async function uploadPostImage(uid, file) {
  if (!uid) return { ok: false, error: "Not signed in" };
  if (!file) return { ok: false, error: "No file selected" };
  if (!file.type?.startsWith("image/")) {
    return { ok: false, error: "Please pick an image file." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `Image is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
    };
  }

  try {
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `posts/${uid}/${stamp}-${rand}.${extFor(file)}`;
    const r = ref(storage, path);
    const snap = await uploadBytes(r, file, {
      contentType: file.type,
    });
    const url = await getDownloadURL(snap.ref);
    return { ok: true, url, path };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug("[Pulse] uploadPostImage failed", err?.code, err?.message);
    return { ok: false, error: err?.message || "Upload failed." };
  }
}

/** Delete a previously-uploaded post image by its storage path. */
export async function deletePostImage(path) {
  if (!path) return { ok: true };
  try {
    await deleteObject(ref(storage, path));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}
