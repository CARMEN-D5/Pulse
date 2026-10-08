// Jest setup shared by every test file (wired up via package.json
// `setupFilesAfterEach`). Everything here stubs a native module that has no
// JS-only implementation, so unit tests never need a device.

/* eslint-env jest */

// AsyncStorage ships an official in-memory mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// SafeAreaProvider measures its own frame on a real device and renders nothing
// until that measurement lands — which never happens under Jest, so every
// screen would come back empty. The library's own mock supplies fixed insets.
// `.default` because the shipped mock is an ESM default export.
jest.mock("react-native-safe-area-context", () =>
  require("react-native-safe-area-context/jest/mock").default
);

// The font hook resolves immediately in tests so screens render their real
// content instead of the loading placeholder.
jest.mock("@expo-google-fonts/manrope", () => ({
  useFonts: () => [true, null],
  Manrope_400Regular: "Manrope_400Regular",
  Manrope_500Medium: "Manrope_500Medium",
  Manrope_600SemiBold: "Manrope_600SemiBold",
  Manrope_700Bold: "Manrope_700Bold",
  Manrope_800ExtraBold: "Manrope_800ExtraBold",
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  MediaTypeOptions: { Images: "Images" },
}));

// Firebase SDK ships ESM that Jest's default transform chokes on
// (@firebase/util/dist/postinstall.mjs). Mock the SDK entry points globally
// so every test suite can import them without transform errors.
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
  getReactNativePersistence: jest.fn(),
  initializeAuth: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
  getFirestore: jest.fn(),
  initializeFirestore: jest.fn(),
  memoryLocalCache: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  getStorage: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  getApp: jest.fn(),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(() => ({})),
}));
