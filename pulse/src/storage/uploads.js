// src/storage/uploads.js
//
// Thin wrapper around Firebase Storage for the social feed. Right now the only
// upload type is "post image" (the picture half of the daily 2-slide post).
// Other upload types (avatars, message attachments) can sit alongside.
//
// On the web this took a DOM `File` straight off an <input type="file">.
// React Native has no File object: expo-image-picker hands back an asset
// descriptor with a local `uri`, and Firebase Storage's `uploadBytes` wants
// binary. `assetToBlob` below bridges the two.

import * as ImagePicker from "expo-image-picker";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "../firebase";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Open the OS photo library and return the chosen image, or null if the user
 * backed out or declined the permission prompt.
 *
 * Returns the picker asset shape: { uri, mimeType, fileSize, width, height }.
 */
export async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, error: "Photo library access is needed to attach an image." };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
  });

  if (result.canceled || !result.assets?.length) return { ok: false, canceled: true };
  return { ok: true, asset: result.assets[0] };
}

/** Pick a reasonable file extension from a picker asset. */
function extFor(asset) {
  const t = asset?.mimeType || "";
  if (t.startsWith("image/")) return t.split("/")[1].replace("jpeg", "jpg");
  const m = (asset?.fileName || asset?.uri || "").match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "jpg";
}

/**
 * Read a local file:// (or content://) URI into a Blob.
 *
 * `fetch` on a local URI is the supported way to do this in React Native — the
 * networking stack special-cases file URIs and resolves to a Blob without ever
 * touching the network.
 */
async function assetToBlob(asset) {
  const response = await fetch(asset.uri);
  return response.blob();
}

/**
 * Upload a post image to Firebase Storage and return a public download URL.
 *
 * Storage path: `/posts/{uid}/{timestamp}-{rand}.{ext}` — keeps each user's
 * uploads in their own folder, which makes the Storage rules trivial.
 */
export async function uploadPostImage(uid, asset) {
  if (!uid) return { ok: false, error: "Not signed in" };
  if (!asset?.uri) return { ok: false, error: "No image selected" };

  try {
    const blob = await assetToBlob(asset);

    // The picker does not always report fileSize (notably for content:// URIs
    // on Android), so the blob's own size is the reliable check.
    if (blob.size > MAX_BYTES) {
      return {
        ok: false,
        error: `Image is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
      };
    }

    const contentType = asset.mimeType || blob.type || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: "Please pick an image file." };
    }

    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `posts/${uid}/${stamp}-${rand}.${extFor(asset)}`;
    const snap = await uploadBytes(ref(storage, path), blob, { contentType });
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
