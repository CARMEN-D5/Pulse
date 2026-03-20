/**
 * ProgressScreen — Shows score trends over time with charts.
 * Placeholder for Phase 4 implementation.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { EmptyState } from "../../shared/components";

export function ProgressScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>
      <EmptyState
        title="No Progress Data Yet"
        message="Complete your daily check-ins to start tracking your progress over time. Charts and insights will appear here."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});
