/**
 * MonthSummaryCard — Shows total income, expenses, and net balance for the month.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Card } from "../../../shared/components";
import { MonthSummary } from "../types/budget.types";
import { formatCurrency } from "../services/budgetService";

interface Props {
  summary: MonthSummary;
  monthLabel: string; // e.g. "March 2026"
}

export function MonthSummaryCard({ summary, monthLabel }: Props) {
  const { totalIncome, totalExpenses, netBalance } = summary;
  const isPositive = netBalance >= 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.monthLabel}>{monthLabel}</Text>

      <View style={styles.row}>
        {/* Income */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: "#22C55E" }]}>
            +{formatCurrency(totalIncome)}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.verticalDivider} />

        {/* Expenses */}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statValue, { color: "#EF4444" }]}>
            -{formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Net balance */}
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Net Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: isPositive ? "#22C55E" : "#EF4444" },
          ]}
        >
          {isPositive ? "+" : "-"}{formatCurrency(Math.abs(netBalance))}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  monthLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: SPACING.md,
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  balanceValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "800",
  },
});
