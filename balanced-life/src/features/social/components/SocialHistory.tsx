/**
 * SocialHistory — List of recent social interactions.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { SocialLogEntry, INTERACTION_OPTIONS } from "../types/social.types";

interface SocialHistoryProps {
  logs: SocialLogEntry[];
}

function getInteractionOption(type: string) {
  return INTERACTION_OPTIONS.find((o) => o.type === type) ?? INTERACTION_OPTIONS[1];
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

export function SocialHistory({ logs }: SocialHistoryProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon="👋"
        title="No Interactions Yet"
        message="Log your first interaction above to start tracking your social connections."
        compact
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Interactions</Text>
      {logs.map((log) => {
        const opt = getInteractionOption(log.interactionType);
        return (
          <Card key={log.id} style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {log.contactName[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.entryInfo}>
                <Text style={styles.contactName}>{log.contactName}</Text>
                <View style={styles.entryMeta}>
                  <Text style={styles.interactionType}>
                    {opt.emoji} {opt.label}
                  </Text>
                </View>
                {log.note ? (
                  <Text style={styles.entryNote}>{log.note}</Text>
                ) : null}
              </View>
              <Text style={styles.entryDate}>{formatRelativeDate(log.date)}</Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  entryCard: {
    paddingVertical: SPACING.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  entryMeta: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  interactionType: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
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
});
