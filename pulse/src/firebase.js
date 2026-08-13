// src/firebase.js
//
// Single entry point for Firebase in the Pulse mobile app.
//
// Config is read from environment variables (.env.local at the project root).
// Expo exposes any var prefixed with EXPO_PUBLIC_ to the app bundle on all
// three platforms — that prefix replaced Create React App's REACT_APP_ when
// this project moved to React Native. Copy `.env.example` to `.env.local` and
// fill in the values from the Firebase console (Project settings → General →
// Your apps → SDK setup and configuration).
//
// Once those are set, enable the Email/Password sign-in method in
// Firebase console → Authentication → Sign-in method.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Friendly warning during development if the user forgot to create .env.local.
// In production these vars are baked into the bundle at build time.
if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Pulse] Firebase config is missing. Create pulse/.env.local from " +
      ".env.example and restart `npx expo start --clear`."
  );
}

export const app = initializeApp(firebaseConfig);

// Auth persistence differs by platform.
//
// On the web `getAuth` already persists the session in IndexedDB/localStorage.
// iOS and Android have neither, so without an explicit persistence layer
// Firebase falls back to in-memory storage and silently signs the user out
// every time the app is killed. `getReactNativePersistence` backs the session
// with AsyncStorage instead, which is what keeps a returning user on Home.
//
// `getReactNativePersistence` only exists in the SDK's react-native build, so
// it is undefined on web — hence the branch rather than a plain top-level
// import. Metro picks the right build via the "react-native" export
// condition; see metro.config.js.
export const auth =
  Platform.OS === "web"
    ? firebaseAuth.getAuth(app)
    : firebaseAuth.initializeAuth(app, {
        persistence: firebaseAuth.getReactNativePersistence(AsyncStorage),
      });

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
//    handshake (corporate proxies, ANU campus Wi-Fi, some VPNs, and
//    flaky mobile data). Force is rock-solid at the cost of ~250ms of
//    extra latency on the initial connection — invisible in practice.
//
// 2. `localCache: memoryLocalCache()` — turns OFF Firestore's persistent
//    cache and keeps the snapshot cache purely in memory. The persistent
//    cache is the source of most "ca9 / ve:-1" assertions: once an entry
//    gets out of sync with the watch stream's target version, the SDK
//    kills itself rather than risk serving stale data. Memory-only
//    sidesteps that entirely. Trade-off: offline support is lost and a
//    cold start refetches everything — fine for a uni-scale app.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);
