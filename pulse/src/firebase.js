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
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
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

// `initializeFirestore` (instead of `getFirestore`) lets us pass transport
// and cache options. Two settings here, both targeting the same bug class:
//
//   FIRESTORE (11.x) INTERNAL ASSERTION FAILED:
//   Unexpected state (ID: ca9) CONTEXT: {"ve":-1}
//
// 1. `experimentalForceLongPolling: true` — disables the WebSocket
//    transport entirely and uses long-polling for every request. The
//    auto-detect variant ("try WebSocket first, fall back if it stalls")
//    is slower to recover when the network actively breaks the upgrade
//    handshake (corporate proxies, ANU campus Wi-Fi, some VPNs). Force
//    is rock-solid at the cost of ~250ms of extra latency on the initial
//    connection — invisible to users in practice.
//
// 2. `localCache: memoryLocalCache()` — turns OFF Firestore's IndexedDB
//    persistence and keeps the snapshot cache purely in memory. The
//    persistent cache is the source of most "ca9 / ve:-1" assertions:
//    once an entry in IndexedDB gets out of sync with the watch stream's
//    target version, the SDK kills itself rather than risk serving stale
//    data. Memory-only sidesteps that entirely. Trade-off: offline
//    support is lost and reloading the tab refetches everything — fine
//    for a uni-scale app.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);
