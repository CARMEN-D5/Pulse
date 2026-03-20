/**
 * JournalHistory — Displays past journal entries in a card list.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Card } from "../../../shared/components";
import { EmptyState } from "../../../shared/components/EmptyState";
import { JournalEntry, JOURNAL_MOODS } from "../types/journal.types";
import { formatJournalDate } from "../services/journalService";

interface Props {
  entries: JournalEntry[];
}

function getMoodEmoji(mood: string | null): string {
  if (!mood) return "";
  const found = JOURNAL_MOODS.find((m) => m.value === mood);
  return found?.emoji ?? "";
}

export function JournalHistory({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="📝"
        title="No Journal Entries"
        message="Write your first entry above. Journaling helps you reflect and improve your wellbeing."
        compact
      />
    );
  }

  return (
    <View>
      <Text style={styles.title}>Past Entries</Text>

      {entries.map((entry) => {
        const moodEmoji = getMoodEmoji(entry.mood);
        return (
          <Card key={entry.id} style={styles.entryCard}>
            {/* Header row */}
            <View style={styles.entryHeader}>
              <View style={styles.entryTitleRow}>
                {moodEmoji ? (
                  <Text style={styles.entryMoodEmoji}>{moodEmoji}</Text>
                ) : null}
                <Text style={styles.entryTitle} numberOfLines={1}>
                  {entry.title}
                </Text>
              </View>
              <Text style={styles.entryDate}>
                {formatJournalDate(entry.date)}
              </Text>
            </View>

            {/* Body preview */}
            <Text style={styles.entryBody} numberOfLines={3}>
              {entry.body}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  entryCard: {
    marginBottom: SPACING.sm,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
    marginRight: SPACING.sm,
  },
  entryMoodEmoji: {
    fontSize: 18,
  },
  entryTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  entryDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  entryBody: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
