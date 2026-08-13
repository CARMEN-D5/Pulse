// Promise-based wrappers around React Native's Alert.
//
// The web build used `window.confirm(...)` and `alert(...)`, both of which
// block and return synchronously. React Native's Alert is callback-based and
// never blocks, so call sites become `if (await confirm(...))`. Keeping the
// promise shape here means the surrounding logic reads the same as it did.
import { Alert, Platform } from "react-native";

/** Ask the user to confirm a destructive action. Resolves true if they agree. */
export function confirm(message, { title = "Are you sure?", confirmLabel = "OK", destructive = false } = {}) {
  // react-native-web does not implement Alert with buttons, so on web this
  // falls through to the browser's own dialog.
  if (Platform.OS === "web") {
    return Promise.resolve(
      typeof window !== "undefined" && typeof window.confirm === "function"
        ? window.confirm(message ? `${title}\n\n${message}` : title)
        : true
    );
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Show a simple informational message. */
export function notify(message, title = "Pulse") {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message);
    }
    return;
  }
  Alert.alert(title, message);
}
