// Metro bundler config for Pulse.
//
// The one non-default setting here is `unstable_enablePackageExports`. The
// Firebase JS SDK ships a React Native build behind the "react-native" export
// condition (see @firebase/auth's package.json). Metro only honours that
// condition with package exports enabled — without it, native builds silently
// resolve the browser bundle and `getReactNativePersistence` comes back
// undefined, so auth sessions are lost on every app restart.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ["require", "react-native", "browser", "default"];

module.exports = config;
