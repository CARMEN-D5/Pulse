/**
 * WeekSummaryCard — Key stats at a glance for the weekly review.
 * Shows check-in count, avg score, best day, streak, and engagement tier.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { WeekSummary } from "../types/weeklyReview.types";
import { RewardTier } from "../../scoring/types/scoring.types";
import { getScoreTier } from "../../../config/scoring";

interface WeekSummaryCardProps {
  summary: WeekSummary;
  tier: RewardTier;
  engagementScore: number;
}

const TIER_CONFIG: Record<RewardTier, { emoji: string; label: string; color: string; bg: string }> = {
  gold: { emoji: "🥇", label: "Gold", color: "#D97706", bg: "#FEF3C7" },
  silver: { emoji: "🥈", label: "Silver", color: "#6B7280", bg: "#F3F4F6" },
  bronze: { emoji: "🥉", label: "Bronze", color: "#B45309", bg: "#FEF3C7" },
  none: { emoji: "🎯", label: "Keep Going", color: COLORS.textMuted, bg: COLORS.surface },
};

export function WeekSummaryCard({ summary, tier, engagementScore }: WeekSummaryCardProps) {
  const tierConfig = TIER_CONFIG[tier];
  const scoreTier = getScoreTier(summary.avgBalanceScore);

  return (
    <Card style={styles.card}>
      {/* Tier badge */}
      <View style={[styles.tierBadge, { backgroundColor: tierConfig.bg }]}>
        <Text style={styles.tierEmoji}>{tierConfig.emoji}</Text>
        <Text style={[styles.tierLabel, { color: tierConfig.color }]}>{tierConfig.label} Week</Text>
        <Text style={[styles.tierScore, { color: tierConfig.color }]}>{engagementScore}pts</Text>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.checkInCount}/7</Text>
          <Text style={styles.statLabel}>Check-ins</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: scoreTier.color }]}>
            {summary.avgBalanceScore}
          </Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {summary.bestScore > 0 ? summary.bestScore : "—"}
          </Text>
          <Text style={styles.statLabel}>
            {summary.bestDay ? `Best (${summary.bestDay})` : "Best Day"}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {summary.streakCount > 0 ? `🔥 ${summary.streakCount}` : "—"}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  tierEmoji: {
    fontSize: 20,
  },
  tierLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  tierScore: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  statItem: {
    flex: 1,
    minWidth: "40%",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
