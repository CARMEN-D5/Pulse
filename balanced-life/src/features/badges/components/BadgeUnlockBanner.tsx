/**
 * BadgeUnlockBanner — Celebratory banner showing newly unlocked badges.
 * Displayed on the CheckInResultScreen when badges are earned.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { BadgeDefinition } from "../types/badge.types";

interface Props {
  badges: BadgeDefinition[];
}

export function BadgeUnlockBanner({ badges }: Props) {
  if (badges.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        🎉 {badges.length === 1 ? "Badge Unlocked!" : `${badges.length} Badges Unlocked!`}
      </Text>
      {badges.map((badge) => (
        <View key={badge.id} style={styles.badgeRow}>
          <Text style={styles.emoji}>{badge.emoji}</Text>
          <View style={styles.badgeInfo}>
            <Text style={styles.title}>{badge.title}</Text>
            <Text style={styles.description}>{badge.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFBEB",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: SPACING.lg,
    width: "100%",
    marginBottom: SPACING.lg,
  },
  header: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: "#B45309",
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  emoji: {
    fontSize: 32,
  },
  badgeInfo: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#92400E",
  },
  description: {
    fontSize: FONT_SIZES.caption,
    color: "#B45309",
    marginTop: 2,
  },
});
