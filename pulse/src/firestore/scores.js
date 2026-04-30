import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc
} from "firebase/firestore"

import { db } from "../firebase.js";

//export async function ensure ensureScoresDoc(firebaseUser)
export const addWeekData = async () => {
    const score_type = "Physical"
    const score_int = "10"
    const user_id = "UkMHeZ9PCJgfSesXquoyg47W5R72"

    const weekSubCol = collection(db, "users", user_id, "scores");
    await addDoc(weekSubCol, {
        type: score_type,
        score: score_int
    });
};
