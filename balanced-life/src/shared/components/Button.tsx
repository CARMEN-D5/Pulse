/**
 * Button — Reusable button component with variants.
 * Supports: primary, secondary, outline, ghost
 */
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../config/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const buttonStyles = getButtonStyles(variant, disabled);
  const textStyles = getTextStyles(variant, disabled);

  return (
    <TouchableOpacity
      style={[styles.base, buttonStyles, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : COLORS.primary}
        />
      ) : (
        <Text style={[styles.text, textStyles]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function getButtonStyles(variant: ButtonVariant, disabled: boolean): ViewStyle {
  const opacity = disabled ? 0.5 : 1;

  switch (variant) {
    case "primary":
      return { backgroundColor: COLORS.primary, opacity };
    case "secondary":
      return { backgroundColor: COLORS.primaryLight, opacity };
    case "outline":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        opacity,
      };
    case "ghost":
      return { backgroundColor: "transparent", opacity };
  }
}

function getTextStyles(variant: ButtonVariant, _disabled: boolean): TextStyle {
  switch (variant) {
    case "primary":
      return { color: "#FFFFFF" };
    case "secondary":
      return { color: COLORS.primary };
    case "outline":
      return { color: COLORS.primary };
    case "ghost":
      return { color: COLORS.primary };
  }
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  text: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
  },
});
