// src/firebase.js
//
// Single entry point for Firebase in the Pulse web app.
//
// Config is read from environment variables (.env.local at the project root).
// For Create React App, any var that starts with REACT_APP_ is exposed to the
// browser bundle. Copy `.env.example` to `.env.local` and fill in the values
// from the Firebase console (Project settings → General → Your apps → SDK
// setup and configuration).
//
// Once those are set, enable the Email/Password sign-in method in
// Firebase console → Authentication → Sign-in method.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Friendly warning during development if the user forgot to create .env.local.
// In production these vars are baked into the bundle at build time.
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Pulse] Firebase config is missing. Create pulse/.env.local from " +
      ".env.example and restart `npm start`."
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
