import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, shadow, spacing, type } from "../theme";

export default function CompletedPlansHistory({ plans, savedByPlan, onEdit, onRestore, onDelete }) {
  const history = plans.filter(
    (plan) => plan.status === "completed" || plan.status === "archived"
  );

  return (
    <View style={[styles.card, shadow("sm")]}>
      <Text style={styles.sectionTitle}>History</Text>

      {history.length === 0 ? (
        <Text style={styles.empty}>Completed and archived saving plans will appear here.</Text>
      ) : (
        history.map((plan) => (
          <View key={plan.id} style={styles.row}>
            <View style={[styles.iconBubble, { backgroundColor: `${plan.color}22` }]}>
              <Text style={styles.icon}>{plan.icon}</Text>
            </View>

            <View style={styles.main}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {plan.name}
                </Text>
                <Text
                  style={[
                    styles.status,
                    plan.status === "completed" ? styles.statusCompleted : styles.statusArchived,
                  ]}
                >
                  {plan.status === "completed" ? "Completed" : "Archived"}
                </Text>
              </View>

              {plan.status === "completed" ? (
                <Text style={styles.meta}>
                  {plan.completedAt?.toDate?.().toLocaleDateString("en-AU") ||
                    "Completion date unavailable"}
                </Text>
              ) : null}

              <Text style={styles.meta}>
                ${Number(savedByPlan[plan.id] || 0).toFixed(0)} saved / $
                {Number(plan.targetAmount || 0).toFixed(0)} goal
              </Text>

              <View style={styles.actions}>
                <HistoryAction label="Edit" onPress={() => onEdit(plan)} />
                <HistoryAction label="Restore" onPress={() => onRestore(plan)} />
                <HistoryAction label="Delete" danger onPress={() => onDelete(plan)} />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function HistoryAction({ label, onPress, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Text style={[styles.actionText, danger && styles.actionDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  empty: { ...type.small, color: colors.textMuted },

  row: { flexDirection: "row", gap: spacing.md },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 18 },

  main: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { ...type.bodyMedium, fontFamily: fonts.semibold, color: colors.text, flexShrink: 1 },
  status: {
    ...type.caption,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  statusCompleted: { backgroundColor: "#e3f5ee", color: colors.success },
  statusArchived: { backgroundColor: colors.rowTint, color: colors.textMuted },
  meta: { ...type.caption, color: colors.textMuted },

  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  action: { paddingVertical: spacing.xs },
  actionText: { ...type.label, color: colors.blPrimary },
  actionDanger: { color: colors.error },
});
