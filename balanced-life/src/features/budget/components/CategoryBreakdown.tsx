/**
 * CategoryBreakdown — Bar chart showing spending per expense category.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Card } from "../../../shared/components";
import { EXPENSE_CATEGORIES } from "../types/budget.types";
import { formatCurrency } from "../services/budgetService";

interface Props {
  breakdown: Record<string, number>;
  totalExpenses: number;
}

export function CategoryBreakdown({ breakdown, totalExpenses }: Props) {
  if (totalExpenses === 0) return null;

  // Sort categories by amount descending, only show non-zero
  const sorted = EXPENSE_CATEGORIES
    .map((cat) => ({ ...cat, amount: breakdown[cat.category] ?? 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (sorted.length === 0) return null;

  const maxAmount = sorted[0].amount;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Spending Breakdown</Text>

      {sorted.map((item) => {
        const pct = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
        const barWidth = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;

        return (
          <View key={item.category} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
            <View style={styles.barCol}>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.max(barWidth, 3)}%` as any,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              <Text style={styles.pct}>{Math.round(pct)}%</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  labelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 100,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  barCol: {
    flex: 1,
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
  amountCol: {
    alignItems: "flex-end",
    minWidth: 72,
  },
  amount: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  pct: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});
