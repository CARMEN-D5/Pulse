/**
 * EngagementCard — Weekly engagement score with reward tier,
 * progress bars for each component, and days-remaining countdown.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { WeeklyEngagement, RewardTier } from "../types/scoring.types";

interface Props {
  engagement: WeeklyEngagement;
}

// Tier visual config
const TIER_CONFIG: Record<RewardTier, { label: string; emoji: string; color: string; bgColor: string }> = {
  none: { label: "Keep Going", emoji: "🎯", color: COLORS.textMuted, bgColor: COLORS.surface },
  bronze: { label: "Bronze", emoji: "🥉", color: "#CD7F32", bgColor: "#FDF4E7" },
  silver: { label: "Silver", emoji: "🥈", color: "#71717A", bgColor: "#F4F4F5" },
  gold: { label: "Gold", emoji: "🥇", color: "#CA8A04", bgColor: "#FEF9C3" },
};

// Next tier messaging
function getNextTierMessage(score: number, daysRemaining: number): string | null {
  if (daysRemaining === 0) return null; // Week is over
  if (score >= 85) return "You've earned Gold this week!";
  if (score >= 60) return `${85 - score} more points to reach Gold`;
  if (score >= 30) return `${60 - score} more points to reach Silver`;
  return `${30 - score} more points to reach Bronze`;
}

const COMPONENTS: {
  key: keyof Pick<WeeklyEngagement, "checkInCompletion" | "actionCompletion" | "streakStrength" | "featureParticipation">;
  label: string;
  color: string;
}[] = [
  { key: "checkInCompletion", label: "Check-ins", color: "#3B82F6" },
  { key: "actionCompletion", label: "Missions", color: "#8B5CF6" },
  { key: "streakStrength", label: "Streak", color: "#F59E0B" },
  { key: "featureParticipation", label: "Features", color: "#10B981" },
];

export function EngagementCard({ engagement }: Props) {
  const tierConfig = TIER_CONFIG[engagement.tier];
  const nextMessage = getNextTierMessage(engagement.overall, engagement.daysRemaining);

  return (
    <View style={styles.card}>
      {/* Header: Title + Tier badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Weekly Engagement</Text>
          <Text style={styles.weekLabel}>{engagement.weekId}</Text>
        </View>
        <View style={[styles.tierBadge, { backgroundColor: tierConfig.bgColor }]}>
          <Text style={styles.tierEmoji}>{tierConfig.emoji}</Text>
          <Text style={[styles.tierText, { color: tierConfig.color }]}>
            {tierConfig.label}
          </Text>
        </View>
      </View>

      {/* Overall score bar */}
      <View style={styles.overallSection}>
        <View style={styles.overallHeader}>
          <Text style={styles.overallScore}>{engagement.overall}/100</Text>
          {engagement.daysRemaining > 0 && (
            <Text style={styles.daysRemaining}>
              {engagement.daysRemaining} day{engagement.daysRemaining !== 1 ? "s" : ""} left
            </Text>
          )}
        </View>
        <View style={styles.overallBarBg}>
          <View
            style={[
              styles.overallBarFill,
              { width: `${Math.max(engagement.overall, 1)}%` as any },
            ]}
          />
          {/* Tier markers */}
          <View style={[styles.tierMarker, { left: "30%" }]} />
          <View style={[styles.tierMarker, { left: "60%" }]} />
          <View style={[styles.tierMarker, { left: "85%" }]} />
        </View>
        <View style={styles.tierLabelsRow}>
          <Text style={styles.tierMarkerLabel}>Bronze</Text>
          <Text style={styles.tierMarkerLabel}>Silver</Text>
          <Text style={styles.tierMarkerLabel}>Gold</Text>
        </View>
      </View>

      {/* Next tier motivation */}
      {nextMessage && (
        <View style={[styles.motivationBanner, { backgroundColor: tierConfig.bgColor }]}>
          <Text style={[styles.motivationText, { color: tierConfig.color }]}>
            {nextMessage}
          </Text>
        </View>
      )}

      {/* Sub-component breakdown */}
      <View style={styles.breakdownContainer}>
        {COMPONENTS.map(({ key, label, color }) => {
          const value = engagement[key];
          return (
            <View key={key} style={styles.breakdownRow}>
              <View style={styles.labelRow}>
                <Text style={styles.breakdownLabel}>{label}</Text>
                <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(value, 2)}%` as any,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  weekLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  tierEmoji: {
    fontSize: 16,
  },
  tierText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
  },
  overallSection: {
    marginBottom: SPACING.md,
  },
  overallHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  overallScore: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  daysRemaining: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  overallBarBg: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: "hidden",
    position: "relative",
  },
  overallBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  tierMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.background,
  },
  tierLabelsRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  tierMarkerLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: "600",
    position: "absolute",
  },
  motivationBanner: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  motivationText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  breakdownContainer: {
    gap: SPACING.md,
  },
  breakdownRow: {
    gap: SPACING.xs,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
  },
  barBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});
