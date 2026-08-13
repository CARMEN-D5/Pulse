import React from "react";
import { StyleSheet, Text, View } from "react-native";

import SavingModalShell from "./SavingModalShell";
import { PrimaryButton } from "../components/ui";
import { colors, fonts, radius, spacing, type } from "../theme";

export default function SavingDetailsModal({ dayKey, entries, plans, onClose }) {
  const planMap = Object.fromEntries(plans.map((plan) => [plan.id, plan]));
  const date = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <SavingModalShell
      title="Saving details"
      subtitle={date}
      onClose={onClose}
      footer={<PrimaryButton label="Close" onPress={onClose} style={styles.flex} />}
    >
      {entries.length === 0 ? (
        <Text style={styles.empty}>No saving record</Text>
      ) : (
        <>
          {entries.map((entry) => {
            const plan = planMap[entry.planId];
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: plan?.color || "#aaa" }]} />
                <View style={styles.rowMain}>
                  <Text style={styles.planName} numberOfLines={1}>
                    {plan?.icon} {plan?.name || "Unknown plan"}
                  </Text>
                  <Text style={styles.source}>
                    {entry.source === "unused-daily-budget" ? "Unused daily budget" : "Manual"}
                  </Text>
                </View>
                <Text style={styles.amount}>${Number(entry.amount).toFixed(2)}</Text>
              </View>
            );
          })}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              ${entries.reduce((sum, entry) => sum + Number(entry.amount), 0).toFixed(2)}
            </Text>
          </View>
        </>
      )}
    </SavingModalShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { ...type.small, color: colors.textMuted, paddingVertical: spacing.md },

  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: radius.pill },
  rowMain: { flex: 1 },
  planName: { ...type.bodyMedium, color: colors.text },
  source: { ...type.caption, color: colors.textMuted },
  amount: { ...type.body, fontFamily: fonts.semibold, color: colors.text },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalLabel: { ...type.bodyMedium, color: colors.textMuted },
  totalAmount: { ...type.body, fontFamily: fonts.bold, color: colors.text },
});
