// Saving plan summary card.
//
// The web build hung "edit" off a double-click plus a 550ms pointer hold.
// Neither survives on touch, so the whole card is a Pressable: tap to edit,
// matching the tap-to-edit rows elsewhere in the app.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing, type } from "../theme";

const money = (value, decimals = 0) => `$${Number(value || 0).toFixed(decimals)}`;
const formatDate = (value) =>
  value.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default function SavingPlanCard({ plan, savedAmount, onEdit }) {
  const target = Number(plan.targetAmount || 0);
  const remaining = Math.max(0, target - savedAmount);
  const due = new Date(`${plan.dueDate}T23:59:59`);
  const now = new Date();
  const rawDays = Math.ceil((due - now) / 86400000);
  const expiredDays = rawDays < 0 ? Math.max(1, Math.floor((now - due) / 86400000)) : 0;
  const percentage = target ? Math.min(100, (savedAmount / target) * 100) : 0;
  const created = plan.createdAt?.toDate?.() || (plan.createdAt ? new Date(plan.createdAt) : null);

  return (
    <Pressable
      onPress={() => onEdit(plan)}
      accessibilityRole="button"
      accessibilityLabel={`${plan.name} saving plan. Tap to edit.`}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: plan.color || colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.titleRow}>
        <View style={styles.identity}>
          <Text style={styles.icon}>{plan.icon}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {plan.name}
          </Text>
        </View>
        <View style={styles.titleEnd}>
          <Text style={styles.goal}>{money(target)}</Text>
          <Text style={styles.percentage}>{percentage.toFixed(0)}%</Text>
        </View>
      </View>

      <View
        style={styles.progressTrack}
        accessibilityLabel={`${percentage.toFixed(0)}% saved`}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${percentage}%`, backgroundColor: plan.color || colors.blPrimary },
          ]}
        />
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceText}>Saved {money(savedAmount)}</Text>
        <Text style={styles.balanceText}>{money(remaining)} left</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          {created ? formatDate(created) : "Start date unavailable"} – {formatDate(due)}
        </Text>

        {expiredDays ? (
          <Text style={[styles.footerText, styles.expired]}>
            Expired {expiredDays} day{expiredDays === 1 ? "" : "s"} ago
          </Text>
        ) : (
          <View style={styles.timing}>
            {rawDays > 0 ? (
              <Text style={styles.footerText}>{money(remaining / rawDays, 2)}/day needed</Text>
            ) : null}
            <Text style={styles.daysLeft}>{Math.max(0, rawDays)} days left</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  icon: { fontSize: 20 },
  name: { ...type.title, color: colors.text, flexShrink: 1 },
  titleEnd: { alignItems: "flex-end" },
  goal: { ...type.label, color: colors.textMuted },
  percentage: { ...type.title, fontFamily: fonts.bold, color: colors.text },

  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.rowTint,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill },

  balanceRow: { flexDirection: "row", justifyContent: "space-between" },
  balanceText: { ...type.small, color: colors.textMuted },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: spacing.sm },
  footerText: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  expired: { color: colors.error, fontFamily: fonts.semibold },
  timing: { alignItems: "flex-end" },
  daysLeft: { ...type.caption, fontFamily: fonts.semibold, color: colors.text },
});
