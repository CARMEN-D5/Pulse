/**
 * ScoreCircle — Displays a score (0-100) inside a coloured circle.
 * Colour changes based on score tier.
 */
import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { COLORS, FONT_SIZES, BORDER_RADIUS } from "../../config/theme";
import { getScoreTier } from "../../config/scoring";

interface ScoreCircleProps {
  score: number;
  size?: number;
  label?: string;
  style?: ViewStyle;
}

export function ScoreCircle({
  score,
  size = 100,
  label,
  style,
}: ScoreCircleProps) {
  const tier = getScoreTier(score);

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: tier.color,
          },
        ]}
      >
        <Text
          style={[
            styles.score,
            {
              color: tier.color,
              fontSize: size * 0.32,
            },
          ]}
        >
          {score}
        </Text>
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  circle: {
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  score: {
    fontWeight: "700",
  },
  label: {
    marginTop: 6,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
