// Segmented selector standing in for the web build's <select> dropdowns.
//
// Every <select> in this app had three or four short options (task priority,
// expense category, activity type). On a phone a row of pills beats a modal
// dropdown for that many choices: one tap instead of three, and the current
// value stays visible. The value written back is unchanged.
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing, type } from "../theme";

export default function SegmentedField({
  label,
  options,
  value,
  onChange,
  scrollable = false,
  style,
}) {
  const items = options.map((opt) => {
    const active = opt.value === value;
    return (
      <Pressable
        key={opt.value}
        onPress={() => onChange(opt.value)}
        accessibilityRole="radio"
        accessibilityState={{ selected: active }}
        accessibilityLabel={opt.label}
        style={({ pressed }) => [
          styles.segment,
          scrollable ? styles.segmentAuto : styles.segmentFlex,
          active && [styles.segmentActive, opt.color && { backgroundColor: opt.color, borderColor: opt.color }],
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
          {opt.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          accessibilityRole="radiogroup"
        >
          {items}
        </ScrollView>
      ) : (
        <View style={styles.row} accessibilityRole="radiogroup">
          {items}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.blOnSurfaceVariant,
    paddingLeft: spacing.xs,
    marginBottom: 6,
  },
  row: { flexDirection: "row", gap: 6 },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  segmentFlex: { flex: 1 },
  segmentAuto: { flexGrow: 0 },
  segmentActive: { backgroundColor: colors.blPrimary, borderColor: colors.blPrimary },
  segmentText: { ...type.small, color: colors.text },
  segmentTextActive: { color: "#fff", fontFamily: fonts.semibold },
  pressed: { opacity: 0.7 },
});
