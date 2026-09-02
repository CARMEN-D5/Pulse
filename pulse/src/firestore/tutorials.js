import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "../firebase";

export async function saveTutorialResult(uid, tutorialId, version, status) {
  if (!uid || !tutorialId) return { ok: false, error: "Missing tutorial identity" };
  try {
    await updateDoc(doc(db, "users", uid), {
      [`tutorialProgress.${tutorialId}`]: {
        version,
        status,
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Could not save tutorial progress" };
  }
}

export async function resetTutorialProgress(uid) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    await updateDoc(doc(db, "users", uid), {
      tutorialProgress: {},
      updatedAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "Could not reset tutorials" };
  }
}

