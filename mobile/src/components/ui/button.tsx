import { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { createShadow, theme } from "@/theme/tokens";

type ButtonProps = PropsWithChildren<{
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  tone?: "primary" | "secondary" | "ghost" | "danger";
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
        tone === "danger" ? styles.danger : null,
        (disabled || loading) ? styles.disabled : null,
        pressed && !disabled && !loading ? styles.pressed : null
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === "primary" ? "#ffffff" : theme.colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            tone === "primary" ? styles.labelPrimary : null,
            tone === "secondary" ? styles.labelSecondary : null,
            tone === "ghost" ? styles.labelGhost : null,
            tone === "danger" ? styles.labelDanger : null
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: theme.radii.pill,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  primary: {
    ...createShadow("md"),
    backgroundColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    borderWidth: 1
  },
  ghost: {
    backgroundColor: "transparent",
    minHeight: 48,
    paddingHorizontal: 8
  },
  danger: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(172, 52, 52, 0.18)",
    borderWidth: 1
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }]
  },
  label: {
    fontSize: 16,
    fontWeight: "700"
  },
  labelPrimary: {
    color: "#FFFFFF"
  },
  labelSecondary: {
    color: theme.colors.text
  },
  labelGhost: {
    color: theme.colors.primary
  },
  labelDanger: {
    color: theme.colors.danger
  }
});
