/**
 * MissionRecap — Shows completed, skipped, and pending missions for the week.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { DOMAINS } from "../../../config/domains";
import { AssignedMission } from "../../missions/types/mission.types";

interface MissionRecapProps {
  completed: AssignedMission[];
  skipped: AssignedMission[];
  pending: AssignedMission[];
  totalCount: number;
  completedCount: number;
}

function MissionItem({ mission, status }: { mission: AssignedMission; status: "completed" | "skipped" | "pending" }) {
  const domain = DOMAINS[mission.domain];
  const statusConfig = {
    completed: { icon: "✅", color: COLORS.success },
    skipped: { icon: "⏭️", color: COLORS.textMuted },
    pending: { icon: "⏳", color: COLORS.warning },
  };
  const cfg = statusConfig[status];

  return (
    <View style={styles.missionItem}>
      <Text style={styles.statusIcon}>{cfg.icon}</Text>
      <View style={styles.missionInfo}>
        <Text style={styles.missionTitle}>{mission.title}</Text>
        <View style={styles.missionMeta}>
          <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
          <Text style={styles.missionDomain}>{domain.label}</Text>
        </View>
      </View>
    </View>
  );
}

export function MissionRecap({ completed, skipped, pending, totalCount, completedCount }: MissionRecapProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Missions</Text>
        <Text style={[styles.pct, { color: pct === 100 ? COLORS.success : COLORS.textSecondary }]}>
          {completedCount}/{totalCount} ({pct}%)
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(pct, 1)}%` as any,
              backgroundColor: pct === 100 ? COLORS.success : COLORS.primary,
            },
          ]}
        />
      </View>

      {/* Mission list */}
      {totalCount === 0 ? (
        <Text style={styles.emptyText}>No missions were assigned this week.</Text>
      ) : (
        <View style={styles.missionList}>
          {completed.map((m) => <MissionItem key={m.id} mission={m} status="completed" />)}
          {pending.map((m) => <MissionItem key={m.id} mission={m} status="pending" />)}
          {skipped.map((m) => <MissionItem key={m.id} mission={m} status="skipped" />)}
        </View>
      )}
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
  pct: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },
  barBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  missionList: {
    gap: SPACING.sm,
  },
  missionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statusIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  missionInfo: {
    flex: 1,
    gap: 2,
  },
  missionTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  missionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  missionDomain: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: SPACING.sm,
  },
});
