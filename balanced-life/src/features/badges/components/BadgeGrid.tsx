/**
 * BadgeGrid — Displays all badges grouped by category.
 * Shows unlocked count and a 3-column grid of badge cards.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { BadgeDefinition, UnlockedBadge } from "../types/badge.types";
import { BADGE_LIBRARY } from "../constants/badgeLibrary";
import { BadgeCard } from "./BadgeCard";
import { EmptyState } from "../../../shared/components/EmptyState";

interface Props {
  unlockedBadges: UnlockedBadge[];
}

const CATEGORIES: { key: BadgeDefinition["category"]; label: string }[] = [
  { key: "streak", label: "Streaks" },
  { key: "score", label: "Score" },
  { key: "missions", label: "Missions" },
  { key: "engagement", label: "Engagement" },
  { key: "special", label: "Special" },
];

export function BadgeGrid({ unlockedBadges }: Props) {
  const unlockedIds = new Set(unlockedBadges.map((b) => b.id));
  const unlockedMap = new Map(unlockedBadges.map((b) => [b.id, b]));
  const totalUnlocked = unlockedBadges.length;
  const totalBadges = BADGE_LIBRARY.length;

  if (totalUnlocked === 0) {
    return (
      <EmptyState
        icon="🏅"
        title="No Achievements Yet"
        message="Complete check-ins, missions, and build streaks to earn your first badge!"
        compact
      />
    );
  }

  return (
    <View>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {totalUnlocked}/{totalBadges} unlocked
        </Text>
        <View style={styles.summaryBarBg}>
          <View
            style={[
              styles.summaryBarFill,
              { width: `${(totalUnlocked / totalBadges) * 100}%` as any },
            ]}
          />
        </View>
      </View>

      {/* Grouped badges */}
      {CATEGORIES.map(({ key, label }) => {
        const badges = BADGE_LIBRARY.filter((b) => b.category === key);
        if (badges.length === 0) return null;

        return (
          <View key={key} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{label}</Text>
            <View style={styles.grid}>
              {badges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  unlocked={unlockedIds.has(badge.id)}
                  unlockedAt={unlockedMap.get(badge.id)?.unlockedAt}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
    minWidth: 90,
  },
  summaryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
});
