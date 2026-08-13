import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import SavingModalShell from "./SavingModalShell";
import SegmentedField from "../components/SegmentedField";
import Icon from "../components/Icon";
import { PrimaryButton } from "../components/ui";
import { colors, fonts, radius, spacing, type } from "../theme";

export default function SavingEntryModal({
  dayKey,
  plans,
  entries,
  onClose,
  onSave,
  onCreatePlan,
}) {
  const [rows, setRows] = useState(() =>
    entries.length
      ? entries.map((entry) => ({
          planId: entry.planId,
          amount: String(entry.amount ?? ""),
          source: entry.source,
        }))
      : [{ planId: plans[0]?.id || "", amount: "", source: "manual" }]
  );
  const [saving, setSaving] = useState(false);

  const patch = (index, value) =>
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...value } : row))
    );

  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const valid = rows.length === 0 || rows.every((row) => row.planId && Number(row.amount) > 0);
  const date = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // The web build used a <select> per row; SegmentedField is this app's
  // stand-in for that, and plan counts here are small enough for pills.
  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.icon} ${plan.name}`,
  }));

  return (
    <SavingModalShell
      title="Add saving record"
      subtitle={date}
      onClose={onClose}
      footer={
        <>
          <PrimaryButton label="Cancel" variant="danger" onPress={onClose} style={styles.flex} />
          {plans.length > 0 ? (
            <PrimaryButton
              label={saving ? "Saving…" : "Save"}
              disabled={!valid || saving}
              loading={saving}
              onPress={async () => {
                setSaving(true);
                await onSave(rows);
                setSaving(false);
              }}
              style={styles.flex}
            />
          ) : null}
        </>
      }
    >
      {plans.length === 0 ? (
        <View style={styles.noPlans}>
          <Text style={styles.hint}>No active saving plan</Text>
          <PrimaryButton label="Create a saving plan" onPress={onCreatePlan} />
        </View>
      ) : (
        <>
          <Text style={styles.hint}>
            Add <Text style={styles.hintStrong}>${total.toFixed(2)}</Text> to a saving plan
          </Text>

          {rows.map((row, index) => (
            <View key={index} style={styles.row}>
              <View style={styles.rowHead}>
                <TextInput
                  style={[styles.input, styles.flex]}
                  value={String(row.amount)}
                  onChangeText={(value) => patch(index, { amount: value })}
                  placeholder="$0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Amount"
                />
                <Pressable
                  onPress={() =>
                    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Delete row"
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Icon name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <SegmentedField
                options={planOptions}
                value={row.planId}
                onChange={(value) => patch(index, { planId: value })}
                scrollable
              />
            </View>
          ))}

          {rows.length < 4 ? (
            <Pressable
              onPress={() =>
                setRows((current) => [
                  ...current,
                  { planId: plans[0]?.id || "", amount: "", source: "manual" },
                ])
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
            >
              <Text style={styles.addRowText}>+ Add another saving</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </SavingModalShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  noPlans: { gap: spacing.md },
  hint: { ...type.body, color: colors.textMuted },
  hintStrong: { fontFamily: fonts.bold, color: colors.text },

  row: { gap: spacing.sm },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
    color: colors.text,
  },

  addRow: { paddingVertical: spacing.sm },
  addRowText: { ...type.label, color: colors.blPrimary },
});
