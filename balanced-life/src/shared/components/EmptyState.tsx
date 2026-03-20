/**
 * EmptyState — Shown when a screen has no data yet.
 * Displays an optional emoji icon, title, message, and action button.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  /** Large emoji displayed above the title */
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Use compact layout inside cards (no flex:1) */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  compact: {
    flex: 0,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  message: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: SPACING.lg,
  },
});
