/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Pure TypeScript tests (scoring engine, utils) — fast, no babel needed
    {
      displayName: "unit",
      testMatch: [
        "<rootDir>/src/features/scoring/__tests__/**/*.test.ts",
        "<rootDir>/src/shared/**/__tests__/**/*.test.ts",
      ],
      transform: {
        "^.+\\.tsx?$": "ts-jest",
      },
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    },
    // React Native component tests — uses jest-expo babel pipeline
    {
      displayName: "components",
      preset: "jest-expo",
      testMatch: [
        "<rootDir>/src/features/**/__tests__/**/*.test.tsx",
        "<rootDir>/src/screens/**/__tests__/**/*.test.tsx",
      ],
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-svg|firebase|@firebase)",
      ],
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    },
  ],
};
