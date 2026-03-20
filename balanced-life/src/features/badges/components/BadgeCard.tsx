/**
 * BadgeCard — Displays a single badge (unlocked or locked).
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { BadgeDefinition } from "../types/badge.types";

interface Props {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt?: string;
}

export function BadgeCard({ badge, unlocked, unlockedAt }: Props) {
  return (
    <View style={[styles.card, !unlocked && styles.cardLocked]}>
      <Text style={[styles.emoji, !unlocked && styles.emojiLocked]}>
        {unlocked ? badge.emoji : "🔒"}
      </Text>
      <Text
        style={[styles.title, !unlocked && styles.textLocked]}
        numberOfLines={1}
      >
        {badge.title}
      </Text>
      <Text
        style={[styles.description, !unlocked && styles.textLocked]}
        numberOfLines={2}
      >
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "31%",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    alignItems: "center",
    minHeight: 110,
  },
  cardLocked: {
    backgroundColor: COLORS.surface,
    opacity: 0.6,
  },
  emoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  emojiLocked: {
    fontSize: 22,
  },
  title: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 2,
  },
  description: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 13,
  },
  textLocked: {
    color: COLORS.textMuted,
  },
});
