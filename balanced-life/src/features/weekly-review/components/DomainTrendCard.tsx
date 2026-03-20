/**
 * DomainTrendCard — Shows domain score changes over the week
 * with a mini bar chart and most improved / needs attention callouts.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { DOMAINS, DOMAIN_IDS } from "../../../config/domains";
import { ReviewDaySnapshot, WeekSummary } from "../types/weeklyReview.types";
import { getScoreTier } from "../../../config/scoring";

interface DomainTrendCardProps {
  snapshots: ReviewDaySnapshot[];
  summary: WeekSummary;
}

export function DomainTrendCard({ snapshots, summary }: DomainTrendCardProps) {
  if (snapshots.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Domain Trends</Text>
        <Text style={styles.emptyText}>No data this week.</Text>
      </Card>
    );
  }

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Domain Trends</Text>

      {/* Callouts */}
      {summary.mostImprovedDomain && summary.mostImprovedAmount > 0 && (
        <View style={[styles.callout, { backgroundColor: "#DCFCE7" }]}>
          <Text style={styles.calloutEmoji}>📈</Text>
          <Text style={[styles.calloutText, { color: COLORS.success }]}>
            {DOMAINS[summary.mostImprovedDomain].label} improved +{summary.mostImprovedAmount}
          </Text>
        </View>
      )}
      {summary.needsAttentionDomain && summary.needsAttentionAmount < 0 && (
        <View style={[styles.callout, { backgroundColor: "#FEE2E2" }]}>
          <Text style={styles.calloutEmoji}>📉</Text>
          <Text style={[styles.calloutText, { color: COLORS.error }]}>
            {DOMAINS[summary.needsAttentionDomain].label} dropped {summary.needsAttentionAmount}
          </Text>
        </View>
      )}

      {/* Domain rows */}
      {DOMAIN_IDS.map((id) => {
        const domain = DOMAINS[id];
        const startScore = first.domainScores[id] ?? 0;
        const endScore = last.domainScores[id] ?? 0;
        const diff = Math.round((endScore - startScore) * 10) / 10;
        const tier = getScoreTier(endScore);

        return (
          <View key={id} style={styles.domainRow}>
            <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
            <Text style={styles.domainName}>{domain.label}</Text>
            {diff !== 0 && (
              <Text style={[styles.domainChange, { color: diff > 0 ? COLORS.success : COLORS.error }]}>
                {diff > 0 ? "+" : ""}{diff}
              </Text>
            )}
            <Text style={[styles.domainScore, { color: tier.color }]}>{endScore}</Text>
          </View>
        );
      })}

      {/* Daily balance score mini chart */}
      <View style={styles.miniChart}>
        <Text style={styles.miniChartLabel}>Daily Balance Score</Text>
        <View style={styles.barRow}>
          {snapshots.map((snap) => {
            const height = Math.max((snap.balanceScore / 100) * 60, 4);
            const tier = getScoreTier(snap.balanceScore);
            return (
              <View key={snap.date} style={styles.barCol}>
                <View style={[styles.bar, { height, backgroundColor: tier.color }]} />
                <Text style={styles.barLabel}>{snap.dayLabel}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  callout: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  calloutEmoji: {
    fontSize: 16,
  },
  calloutText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  domainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  domainName: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  domainChange: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  domainScore: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "right",
  },
  // Mini bar chart
  miniChart: {
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  miniChartLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  barRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 80,
    gap: SPACING.xs,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "70%",
    borderRadius: 4,
    minWidth: 16,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    textAlign: "center",
  },
});
