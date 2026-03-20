import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS } from "../../../config/domains";
import { AssignedMission } from "../types/mission.types";

interface Props {
  mission: AssignedMission;
  onComplete: () => void;
  onSkip: () => void;
}

export function MissionCard({ mission, onComplete, onSkip }: Props) {
  const domain = DOMAINS[mission.domain];
  const isDone = mission.status === "completed";
  const isSkipped = mission.status === "skipped";
  const isResolved = isDone || isSkipped;

  return (
    <View
      style={[
        styles.card,
        isDone && styles.completedCard,
        isSkipped && styles.skippedCard,
      ]}
    >
      {/* Domain badge + time */}
      <View style={styles.topRow}>
        <View style={[styles.domainBadge, { backgroundColor: domain.lightColor }]}>
          <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
          <Text style={[styles.domainLabel, { color: domain.color }]}>
            {domain.label}
          </Text>
        </View>
        <Text style={styles.time}>{mission.estimatedMinutes} min</Text>
      </View>

      {/* Title */}
      <Text style={[styles.title, isResolved && styles.resolvedTitle]}>
        {isDone && "✅ "}{isSkipped && "⏭️ "}{mission.title}
      </Text>

      {/* Description */}
      <Text style={styles.description}>{mission.description}</Text>

      {/* Action buttons */}
      {!isResolved && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: domain.color }]}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status indicator for resolved missions */}
      {isDone && (
        <Text style={styles.statusText}>Completed</Text>
      )}
      {isSkipped && (
        <Text style={[styles.statusText, { color: COLORS.textMuted }]}>Skipped</Text>
      )}
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
    marginBottom: SPACING.md,
  },
  completedCard: {
    borderColor: COLORS.success,
    backgroundColor: "#F0FDF4",
  },
  skippedCard: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  domainLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  time: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  title: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  resolvedTitle: {
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  skipButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.body,
    fontWeight: "500",
  },
  statusText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.success,
    marginTop: SPACING.xs,
  },
});
