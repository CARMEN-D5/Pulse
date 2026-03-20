/**
 * BudgetScreen — Income & Expense Tracker.
 * Month summary, category breakdown, transaction form, and history.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuthStore } from "../../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import {
  TransactionType,
  TransactionCategory,
  Transaction,
  MonthSummary,
} from "../types/budget.types";
import {
  logTransaction,
  fetchMonthTransactions,
  computeMonthSummary,
} from "../services/budgetService";
import { TransactionForm } from "../components/TransactionForm";
import { MonthSummaryCard } from "../components/MonthSummaryCard";
import { CategoryBreakdown } from "../components/CategoryBreakdown";
import { TransactionHistory } from "../components/TransactionHistory";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function BudgetScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    categoryBreakdown: {},
  });
  const [loading, setLoading] = useState(true);

  const monthLabel = `${MONTHS[month - 1]} ${year}`;
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const txs = await fetchMonthTransactions(user.uid, year, month);
      setTransactions(txs);
      setSummary(computeMonthSummary(txs));
    } catch (e) {
      console.error("Failed to load budget data:", e);
    } finally {
      setLoading(false);
    }
  }, [user, year, month]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return; // can't go forward past current month
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSubmit = async (
    type: TransactionType,
    category: TransactionCategory,
    amount: number,
    note: string
  ) => {
    if (!user) return;
    const tx = await logTransaction(user.uid, type, category, amount, note);
    // Refresh data
    const updated = [tx, ...transactions];
    setTransactions(updated);
    setSummary(computeMonthSummary(updated));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Budget</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
            disabled={isCurrentMonth}
          >
            <Text
              style={[
                styles.monthArrowText,
                isCurrentMonth && { color: COLORS.textMuted },
              ]}
            >
              ▶
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Month Summary */}
            <MonthSummaryCard summary={summary} monthLabel={monthLabel} />

            {/* Category Breakdown */}
            <CategoryBreakdown
              breakdown={summary.categoryBreakdown}
              totalExpenses={summary.totalExpenses}
            />

            {/* Transaction Form (only for current month) */}
            {isCurrentMonth && <TransactionForm onSubmit={handleSubmit} />}

            {/* Transaction History */}
            <TransactionHistory transactions={transactions} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  backButton: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
    minWidth: 60,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  monthArrow: {
    padding: SPACING.sm,
  },
  monthArrowDisabled: {
    opacity: 0.3,
  },
  monthArrowText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.primary,
    fontWeight: "700",
  },
  monthLabel: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    minWidth: 140,
    textAlign: "center",
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: "center",
  },
});
