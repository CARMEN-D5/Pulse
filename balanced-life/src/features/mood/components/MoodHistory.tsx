/**
 * MoodHistory — Visual mood timeline for the Progress screen.
 * Shows emoji dots on a timeline with date labels, plus a small average summary.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { MoodDataPoint, MOOD_OPTIONS } from "../types/mood.types";

interface MoodHistoryProps {
  data: MoodDataPoint[];
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getAvgMood(data: MoodDataPoint[]): { avg: number; emoji: string; label: string; color: string } | null {
  if (data.length === 0) return null;
  const avg = data.reduce((sum, d) => sum + d.level, 0) / data.length;
  const rounded = Math.round(avg);
  const option = MOOD_OPTIONS.find((o) => o.level === rounded) ?? MOOD_OPTIONS[2];
  return { avg: Math.round(avg * 10) / 10, emoji: option.emoji, label: option.label, color: option.color };
}

export function MoodHistory({ data }: MoodHistoryProps) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No mood data yet. Log your mood after check-ins!</Text>
      </View>
    );
  }

  const avgMood = getAvgMood(data);
  // Show last 14 entries max for the visual timeline
  const recent = data.slice(-14);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mood Tracker</Text>
        {avgMood && (
          <View style={styles.avgBadge}>
            <Text style={styles.avgEmoji}>{avgMood.emoji}</Text>
            <Text style={[styles.avgText, { color: avgMood.color }]}>
              Avg: {avgMood.avg}
            </Text>
          </View>
        )}
      </View>

      {/* Mood timeline */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {recent.map((entry, i) => {
          const option = MOOD_OPTIONS.find((o) => o.level === entry.level)!;
          return (
            <View key={entry.date} style={styles.timelineItem}>
              <Text style={styles.timelineEmoji}>{entry.emoji}</Text>
              <View style={[styles.timelineDot, { backgroundColor: option.color }]} />
              {i < recent.length - 1 && <View style={styles.timelineLine} />}
              <Text style={styles.timelineDate}>{formatShortDate(entry.date)}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Mini bar chart — mood distribution */}
      <View style={styles.distribution}>
        {MOOD_OPTIONS.map((option) => {
          const count = data.filter((d) => d.level === option.level).length;
          const pct = data.length > 0 ? (count / data.length) * 100 : 0;
          return (
            <View key={option.level} style={styles.distRow}>
              <Text style={styles.distEmoji}>{option.emoji}</Text>
              <View style={styles.distBarBg}>
                <View
                  style={[
                    styles.distBarFill,
                    { width: `${Math.max(pct, 1)}%` as any, backgroundColor: option.color },
                  ]}
                />
              </View>
              <Text style={styles.distCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  avgBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  avgEmoji: {
    fontSize: 16,
  },
  avgText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
  },
  // Timeline
  timelineContent: {
    paddingVertical: SPACING.sm,
    gap: 0,
  },
  timelineItem: {
    alignItems: "center",
    width: 48,
    position: "relative",
  },
  timelineEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    position: "absolute",
    top: 34,
    left: 28,
    width: 20,
    height: 2,
    backgroundColor: COLORS.border,
  },
  timelineDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  // Distribution
  distribution: {
    gap: SPACING.xs,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  distEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  distBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  distCount: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
    minWidth: 20,
    textAlign: "right",
  },
  // Empty
  emptyContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
