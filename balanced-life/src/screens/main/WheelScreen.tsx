/**
 * WheelScreen — Radar chart (Balance Wheel) showing all 5 domain scores.
 * Placeholder for Phase 2 implementation with react-native-gifted-charts.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { EmptyState } from "../../shared/components";

export function WheelScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Balance Wheel</Text>
      </View>
      <EmptyState
        title="Complete Your Assessment"
        message="Take the initial assessment to see your Balance Wheel — a radar chart showing how balanced your 5 life domains are."
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
