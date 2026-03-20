/**
 * BadgeGrid — Displays all badges grouped by collapsible categories.
 * Tap a category header to expand/collapse its badge cards.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { BadgeDefinition, UnlockedBadge } from "../types/badge.types";
import { BADGE_LIBRARY } from "../constants/badgeLibrary";
import { BadgeCard } from "./BadgeCard";
import { EmptyState } from "../../../shared/components/EmptyState";

interface Props {
  unlockedBadges: UnlockedBadge[];
}

const CATEGORIES: { key: BadgeDefinition["category"]; label: string; emoji: string }[] = [
  { key: "streak", label: "Streaks", emoji: "🔥" },
  { key: "score", label: "Score", emoji: "🎯" },
  { key: "missions", label: "Missions", emoji: "🚀" },
  { key: "engagement", label: "Engagement", emoji: "💪" },
  { key: "special", label: "Special", emoji: "⭐" },
];

export function BadgeGrid({ unlockedBadges }: Props) {
  const unlockedIds = new Set(unlockedBadges.map((b) => b.id));
  const unlockedMap = new Map(unlockedBadges.map((b) => [b.id, b]));
  const totalUnlocked = unlockedBadges.length;
  const totalBadges = BADGE_LIBRARY.length;

  // Track which categories are expanded (all collapsed by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

      {/* Collapsible badge categories */}
      {CATEGORIES.map(({ key, label, emoji }) => {
        const badges = BADGE_LIBRARY.filter((b) => b.category === key);
        if (badges.length === 0) return null;

        const isExpanded = expandedCategories.has(key);
        const categoryUnlocked = badges.filter((b) => unlockedIds.has(b.id)).length;

        return (
          <View key={key} style={styles.categorySection}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(key)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryHeaderLeft}>
                <Text style={styles.categoryEmoji}>{emoji}</Text>
                <Text style={styles.categoryTitle}>{label}</Text>
                <View style={styles.categoryBadgeCount}>
                  <Text style={styles.categoryBadgeCountText}>
                    {categoryUnlocked}/{badges.length}
                  </Text>
                </View>
              </View>
              <Text style={styles.categoryChevron}>
                {isExpanded ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
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
            )}
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
    marginBottom: SPACING.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  categoryBadgeCount: {
    backgroundColor: COLORS.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeCountText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: COLORS.primary,
  },
  categoryChevron: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
});
