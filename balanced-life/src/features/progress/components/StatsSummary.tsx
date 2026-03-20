import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DailySnapshot } from "../services/progressService";
import { DOMAINS, DomainId, DOMAIN_IDS } from "../../../config/domains";

interface Props {
  snapshots: DailySnapshot[];
}

export function StatsSummary({ snapshots }: Props) {
  if (snapshots.length === 0) return null;

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];

  // Overall change
  const balanceChange = latest.balanceScore - first.balanceScore;

  // Find best and worst performing domains (by change over period)
  let bestDomain: DomainId = DOMAIN_IDS[0];
  let worstDomain: DomainId = DOMAIN_IDS[0];
  let bestChange = -Infinity;
  let worstChange = Infinity;

  for (const id of DOMAIN_IDS) {
    const change = (latest.domainScores[id] ?? 0) - (first.domainScores[id] ?? 0);
    if (change > bestChange) {
      bestChange = change;
      bestDomain = id;
    }
    if (change < worstChange) {
      worstChange = change;
      worstDomain = id;
    }
  }

  // Current streak
  const currentStreak = latest.streakCount ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Check-ins</Text>
          <Text style={styles.statValue}>{snapshots.length}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Score Change</Text>
          <Text
            style={[
              styles.statValue,
              { color: balanceChange >= 0 ? COLORS.success : COLORS.error },
            ]}
          >
            {balanceChange >= 0 ? "+" : ""}
            {Math.round(balanceChange)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>🔥 {currentStreak}</Text>
        </View>
      </View>

      <View style={styles.insightsRow}>
        <View style={[styles.insightCard, { borderLeftColor: DOMAINS[bestDomain].color }]}>
          <Text style={styles.insightLabel}>Most Improved</Text>
          <Text style={styles.insightValue}>{DOMAINS[bestDomain].label}</Text>
          <Text style={[styles.insightChange, { color: COLORS.success }]}>
            +{Math.round(Math.max(bestChange, 0) * 10) / 10}
          </Text>
        </View>
        <View style={[styles.insightCard, { borderLeftColor: DOMAINS[worstDomain].color }]}>
          <Text style={styles.insightLabel}>Needs Focus</Text>
          <Text style={styles.insightValue}>{DOMAINS[worstDomain].label}</Text>
          <Text style={[styles.insightChange, { color: worstChange < 0 ? COLORS.error : COLORS.textMuted }]}>
            {worstChange >= 0 ? "+" : ""}{Math.round(worstChange * 10) / 10}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  insightsRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    padding: SPACING.md,
  },
  insightLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  insightChange: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    marginTop: 2,
  },
});
