/**
 * MoodRecap — Compact mood summary for the weekly review.
 * Shows emoji timeline for the week and average mood.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { MoodDataPoint, MOOD_OPTIONS } from "../../mood/types/mood.types";

interface MoodRecapProps {
  moods: MoodDataPoint[];
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
}

export function MoodRecap({ moods }: MoodRecapProps) {
  if (moods.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Mood</Text>
        <Text style={styles.emptyText}>No moods logged this week.</Text>
      </Card>
    );
  }

  const avg = moods.reduce((sum, m) => sum + m.level, 0) / moods.length;
  const rounded = Math.round(avg);
  const avgOption = MOOD_OPTIONS.find((o) => o.level === rounded) ?? MOOD_OPTIONS[2];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Mood</Text>
        <View style={[styles.avgBadge, { backgroundColor: avgOption.color + "15" }]}>
          <Text style={styles.avgEmoji}>{avgOption.emoji}</Text>
          <Text style={[styles.avgLabel, { color: avgOption.color }]}>
            Avg: {Math.round(avg * 10) / 10}
          </Text>
        </View>
      </View>

      <View style={styles.emojiRow}>
        {moods.map((mood) => (
          <View key={mood.date} style={styles.emojiItem}>
            <Text style={styles.emoji}>{mood.emoji}</Text>
            <Text style={styles.dayLabel}>{formatShortDate(mood.date)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  avgEmoji: {
    fontSize: 16,
  },
  avgLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  emojiItem: {
    alignItems: "center",
    gap: 4,
  },
  emoji: {
    fontSize: 28,
  },
  dayLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: SPACING.sm,
  },
});
