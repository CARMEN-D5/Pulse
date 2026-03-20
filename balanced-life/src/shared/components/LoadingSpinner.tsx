/**
 * LoadingSpinner — Full-screen loading indicator.
 * Used during auth state resolution and data fetching.
 */
import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../../config/theme";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
}

export function LoadingSpinner({
  size = "large",
  color = COLORS.primary,
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
