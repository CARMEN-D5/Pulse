/**
 * TransactionHistory — Recent income/expense entries in a scrollable list.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Card } from "../../../shared/components";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Transaction, ALL_CATEGORIES } from "../types/budget.types";
import { formatCurrency } from "../services/budgetService";

interface Props {
  transactions: Transaction[];
}

/** Lookup a category option by its key */
function getCategoryInfo(cat: string) {
  return ALL_CATEGORIES.find((c) => c.category === cat) ?? {
    category: cat,
    label: cat,
    emoji: "📦",
    color: "#6B7280",
  };
}

/** Format YYYY-MM-DD to readable */
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function TransactionHistory({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon="💸"
        title="No Transactions Yet"
        message="Log your first income or expense above to start tracking your finances."
        compact
      />
    );
  }

  return (
    <View>
      <Text style={styles.title}>Recent Transactions</Text>

      {transactions.map((tx) => {
        const catInfo = getCategoryInfo(tx.category);
        const isIncome = tx.type === "income";

        return (
          <Card key={tx.id} style={styles.txCard}>
            <View style={styles.txRow}>
              {/* Icon */}
              <View style={[styles.txIcon, { backgroundColor: catInfo.color + "15" }]}>
                <Text style={styles.txEmoji}>{catInfo.emoji}</Text>
              </View>

              {/* Info */}
              <View style={styles.txInfo}>
                <Text style={styles.txCategory}>{catInfo.label}</Text>
                {tx.note ? (
                  <Text style={styles.txNote} numberOfLines={1}>
                    {tx.note}
                  </Text>
                ) : null}
                <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
              </View>

              {/* Amount */}
              <Text
                style={[
                  styles.txAmount,
                  { color: isIncome ? "#22C55E" : "#EF4444" },
                ]}
              >
                {isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
              </Text>
            </View>
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
  txCard: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  txEmoji: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
    gap: 1,
  },
  txCategory: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  txNote: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  txDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  txAmount: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "right",
  },
});
