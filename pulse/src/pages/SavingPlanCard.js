// Saving plan summary card.
//
// The web build hung "edit" off a double-click plus a 550ms pointer hold.
// Neither survives on touch, so the whole card is a Pressable: tap to edit,
// matching the tap-to-edit rows elsewhere in the app.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShareButton } from "../components/share";
import { savingPlanSharePayload } from "./savingMilestones";
import { colors, fonts, radius, spacing, type } from "../theme";

const money = (value, decimals = 0) => `$${Number(value || 0).toFixed(decimals)}`;

export default function SavingPlanCard({ plan, savedAmount, onEdit, compact = false }) {
  const target = Number(plan.targetAmount || 0);
  const remaining = Math.max(0, target - savedAmount);
  const due = new Date(`${plan.dueDate}T23:59:59`);
  const now = new Date();
  const rawDays = Math.ceil((due - now) / 86400000);
  const expiredDays = rawDays < 0 ? Math.max(1, Math.floor((now - due) / 86400000)) : 0;
  const percentage = target ? Math.min(100, (savedAmount / target) * 100) : 0;

  // Manual share, available at any progress rather than only on a milestone.
  // Returns null below 1% or with no target set, and ShareButton hides itself
  // when no template can fill the payload — so a plan with nothing saved
  // shows no button rather than opening an empty prompt.
  const sharePayload = savingPlanSharePayload(plan, savedAmount);

  return (
      <Pressable
          onPress={() => onEdit(plan)}
          accessibilityRole="button"
          accessibilityLabel={`${plan.name} saving plan. Tap to edit.`}
          style={({ pressed }) => [
            styles.card,
            compact && styles.cardCompact,
            { borderLeftColor: plan.color || colors.border },
            pressed && styles.pressed,
          ]}
      >
        <View style={styles.titleRow}>
          <View style={styles.identity}>
            <Text style={[styles.icon, compact && styles.iconCompact]}>{plan.icon}</Text>
            <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
              {plan.name}
            </Text>
          </View>
          <View style={styles.titleEnd}>
            <Text style={[styles.goal, compact && styles.goalCompact]}>{money(target)}</Text>
            <Text style={[styles.percentage, compact && styles.percentageCompact]}>
              {percentage.toFixed(0)}%
            </Text>
          </View>

          {/*
          Nested inside the card's Pressable. React Native's responder system
          gives the touch to the innermost pressable, so tapping this shares
          rather than opening the edit modal — but it is the one interaction
          here worth re-testing on a device after any change to this row.
        */}
          <ShareButton domain="finance" payload={sharePayload} style={styles.share} />
        </View>

        <View
            style={styles.progressTrack}
            accessibilityLabel={`${percentage.toFixed(0)}% saved`}
        >
          <View
              style={[
                styles.progressFill,
                { width: `${percentage}%`, backgroundColor: plan.color || colors.pulsePrimary },
              ]}
          />
        </View>

        <View style={styles.balanceRow}>
          <Text style={[styles.balanceText, compact && styles.balanceTextCompact]} numberOfLines={1}>
            Saved {money(savedAmount)}
          </Text>
          <Text style={[styles.balanceText, compact && styles.balanceTextCompact]} numberOfLines={1}>
            {money(remaining)} left
          </Text>
        </View>

        <View style={styles.footer}>
          {expiredDays ? (
              <Text style={[styles.footerText, styles.expired]} numberOfLines={1}>
                Expired {expiredDays} day{expiredDays === 1 ? "" : "s"} ago
              </Text>
          ) : (
              <Text style={styles.daysLeft} numberOfLines={1}>{Math.max(0, rawDays)} days left</Text>
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
  cardCompact: {
    padding: spacing.md,
    borderLeftWidth: 3,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.7 },

  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  icon: { fontSize: 20 },
  iconCompact: { fontSize: 16 },
  name: { ...type.title, color: colors.text, flexShrink: 1 },
  nameCompact: { fontSize: 14, lineHeight: 18 },
  titleEnd: { alignItems: "flex-end" },
  goal: { ...type.label, color: colors.textMuted },
  goalCompact: { fontSize: 11, lineHeight: 14 },
  percentage: { ...type.title, fontFamily: fonts.bold, color: colors.text },
  percentageCompact: { fontSize: 14, lineHeight: 18 },
  share: { marginLeft: spacing.xs },

  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.rowTint,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill },

  balanceRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  balanceText: { ...type.small, color: colors.textMuted, flexShrink: 1 },
  balanceTextCompact: { fontSize: 11, lineHeight: 14 },

  footer: { flexDirection: "row", justifyContent: "flex-end" },
  footerText: { ...type.caption, color: colors.textMuted, flexShrink: 1 },
  expired: { color: colors.error, fontFamily: fonts.semibold },
  daysLeft: { ...type.caption, fontFamily: fonts.semibold, color: colors.text },
});