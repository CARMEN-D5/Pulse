import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { createShadow, theme } from "@/theme/tokens";

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "highlight" | "muted";
}>;

export function Card({ children, style, variant = "default" }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "highlight" ? styles.highlight : null,
        variant === "muted" ? styles.muted : null,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...createShadow("sm"),
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  highlight: {
    ...createShadow("md"),
    backgroundColor: theme.colors.surfaceStrong
  },
  muted: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderMuted
  }
});
