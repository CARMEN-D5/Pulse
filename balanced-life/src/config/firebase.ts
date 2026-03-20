/**
 * Firebase initialisation.
 *
 * TODO: Replace the config below with your actual Firebase project credentials.
 * Get these from Firebase Console > Project Settings > Your Apps > Config.
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnWM_1i1lvbRHjIus8CpM6g5M-BnikLoU",
  authDomain: "pulse-2531d.firebaseapp.com",
  projectId: "pulse-2531d",
  storageBucket: "pulse-2531d.firebasestorage.app",
  messagingSenderId: "203993728644",
  appId: "1:203993728644:web:83c9df348fa24faedde4d1",
  measurementId: "G-1MQ7511QD3"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
