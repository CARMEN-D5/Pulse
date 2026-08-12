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
