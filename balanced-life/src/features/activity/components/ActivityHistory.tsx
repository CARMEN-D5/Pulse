/**
 * ActivityHistory — List of recent activity logs with weekly stats summary.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import {
  ActivityEntry,
  ACTIVITY_OPTIONS,
  INTENSITY_OPTIONS,
} from "../types/activity.types";
import { calculateWeeklyStats } from "../services/activityService";

interface ActivityHistoryProps {
  activities: ActivityEntry[];
  thisWeekActivities: ActivityEntry[];
}

function getActivityOption(type: string) {
  return ACTIVITY_OPTIONS.find((o) => o.type === type) ?? ACTIVITY_OPTIONS[9]; // "other" fallback
}

function getIntensityOption(intensity: string) {
  return INTENSITY_OPTIONS.find((o) => o.value === intensity) ?? INTENSITY_OPTIONS[1];
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function ActivityHistory({ activities, thisWeekActivities }: ActivityHistoryProps) {
  const stats = calculateWeeklyStats(thisWeekActivities);

  return (
    <View style={styles.container}>
      {/* Weekly stats */}
      {stats.totalSessions > 0 && (
        <Card style={styles.statsCard}>
          <Text style={styles.statsTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.activeDays}</Text>
              <Text style={styles.statLabel}>Active Days</Text>
            </View>
            {stats.mostCommonType && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {getActivityOption(stats.mostCommonType).emoji}
                </Text>
                <Text style={styles.statLabel}>Favourite</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* History list */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activities.length === 0 ? (
        <EmptyState
          icon="🏃"
          title="No Activities Yet"
          message="Log your first physical activity above to start tracking your health."
          compact
        />
      ) : (
        activities.map((entry) => {
          const opt = getActivityOption(entry.type);
          const intOpt = getIntensityOption(entry.intensity);
          return (
            <Card key={entry.id} style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryEmoji}>{opt.emoji}</Text>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryType}>{opt.label}</Text>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryDuration}>{entry.duration} min</Text>
                    <Text style={[styles.entryIntensity, { color: intOpt.color }]}>
                      {intOpt.emoji} {intOpt.label}
                    </Text>
                  </View>
                  {entry.note ? (
                    <Text style={styles.entryNote}>{entry.note}</Text>
                  ) : null}
                </View>
                <Text style={styles.entryDate}>{formatRelativeDate(entry.date)}</Text>
              </View>
            </Card>
          );
        })
      )}

      {/* Health app teaser */}
      <Card style={styles.teaserCard}>
        <Text style={styles.teaserEmoji}>🍎</Text>
        <Text style={styles.teaserTitle}>Health App Integration</Text>
        <Text style={styles.teaserText}>
          Connect Apple Health or Google Fit to auto-sync your activities. Coming in v2!
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  // Weekly stats
  statsCard: {
    gap: SPACING.sm,
  },
  statsTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  // Section title
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  // Entry cards
  entryCard: {
    paddingVertical: SPACING.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  entryEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryType: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  entryMeta: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  entryDuration: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  entryIntensity: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
  entryNote: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    fontStyle: "italic",
  },
  entryDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  // Health app teaser
  teaserCard: {
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  teaserEmoji: {
    fontSize: 32,
  },
  teaserTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  teaserText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
