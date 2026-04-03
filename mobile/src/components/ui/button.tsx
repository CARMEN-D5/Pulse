import { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type ButtonProps = PropsWithChildren<{
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  tone?: "primary" | "secondary" | "ghost";
}>;

export function Button({
  children,
  disabled = false,
  loading = false,
  onPress,
  tone = "primary"
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        tone === "primary" ? styles.primary : null,
        tone === "secondary" ? styles.secondary : null,
        tone === "ghost" ? styles.ghost : null,
        (disabled || loading) ? styles.disabled : null,
        pressed && !disabled && !loading ? styles.pressed : null
      ]}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.label}>{children}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  primary: {
    backgroundColor: "#7a94ff"
  },
  secondary: {
    backgroundColor: "#171d29",
    borderColor: "#2a3140",
    borderWidth: 1
  },
  ghost: {
    backgroundColor: "transparent"
  },
  disabled: {
    opacity: 0.6
  },
  pressed: {
    opacity: 0.85
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  }
});
