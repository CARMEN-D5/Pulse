/**
 * TransactionForm — Log a new income or expense entry.
 * Type toggle → category chips → amount (quick picks + custom) → note → save.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { Card, Button } from "../../../shared/components";
import {
  TransactionType,
  TransactionCategory,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  QUICK_AMOUNTS,
  CategoryOption,
} from "../types/budget.types";

interface Props {
  onSubmit: (
    type: TransactionType,
    category: TransactionCategory,
    amount: number,
    note: string
  ) => Promise<void>;
}

export function TransactionForm({ onSubmit }: Props) {
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState<TransactionCategory | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleQuickAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleSave = async () => {
    if (!category) {
      Alert.alert("Missing category", "Please select a category.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(type, category, numAmount, note);
      // Reset form
      setCategory(null);
      setAmount("");
      setNote("");
    } catch (e) {
      Alert.alert("Error", "Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>New Transaction</Text>

      {/* Type toggle */}
      <View style={styles.typeToggle}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "expense" && styles.typeButtonExpense,
          ]}
          onPress={() => {
            setType("expense");
            setCategory(null);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === "expense" && styles.typeButtonTextActive,
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === "income" && styles.typeButtonIncome,
          ]}
          onPress={() => {
            setType("income");
            setCategory(null);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === "income" && styles.typeButtonTextActive,
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.chipGrid}>
        {categories.map((opt) => {
          const selected = category === opt.category;
          return (
            <TouchableOpacity
              key={opt.category}
              style={[
                styles.chip,
                selected && { backgroundColor: opt.color + "20", borderColor: opt.color },
              ]}
              onPress={() => setCategory(opt.category)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.chipText,
                  selected && { color: opt.color, fontWeight: "700" },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Amount */}
      <Text style={styles.fieldLabel}>Amount ($)</Text>
      <TextInput
        style={styles.amountInput}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
        returnKeyType="done"
      />

      {/* Quick amount buttons */}
      <View style={styles.quickAmounts}>
        {QUICK_AMOUNTS.map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.quickChip,
              amount === String(val) && styles.quickChipSelected,
            ]}
            onPress={() => handleQuickAmount(val)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickChipText,
                amount === String(val) && styles.quickChipTextSelected,
              ]}
            >
              ${val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Note */}
      <Text style={styles.fieldLabel}>Note (optional)</Text>
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="What was this for?"
        placeholderTextColor={COLORS.textMuted}
        maxLength={120}
        returnKeyType="done"
      />

      {/* Save button */}
      <Button
        title={saving ? "Saving..." : `Log ${type === "income" ? "Income" : "Expense"}`}
        onPress={handleSave}
        disabled={saving}
        style={styles.saveButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  typeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: BORDER_RADIUS.sm,
  },
  typeButtonExpense: {
    backgroundColor: "#EF4444",
  },
  typeButtonIncome: {
    backgroundColor: "#22C55E",
  },
  typeButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  fieldLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  amountInput: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickChipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  quickChipTextSelected: {
    color: "#FFFFFF",
  },
  noteInput: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 44,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
});
