// Compact saving-plan list row. Editing remains attached to the whole row,
// matching the existing mobile interaction while avoiding a visible Edit
// button inside the constrained Active Saving Plans container.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShareButton } from "../components/share";
import { savingPlanSharePayload } from "./savingMilestones";
import SavingPlanIcon from "./SavingPlanIcon";
import { colors, fonts, radius, spacing, type } from "../theme";

const DAY_MS = 86400000;
const money = (value, decimals = 0) => `$${Number(value || 0).toFixed(decimals)}`;

function asDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function getSavingPlanDisplay(plan, savedAmount, now = new Date()) {
  const target = Number(plan.targetAmount || 0);
  const saved = Number(savedAmount || 0);
  const remaining = Math.max(0, target - saved);
  const due = asDate(plan.dueDate ? `${plan.dueDate}T23:59:59` : null);
  const rawDays = due ? Math.ceil((due - now) / DAY_MS) : 0;
  const expiredDays = due && rawDays < 0
    ? Math.max(1, Math.floor((now - due) / DAY_MS))
    : 0;

  return {
    target,
    saved,
    remaining,
    percentage: target ? Math.min(100, (saved / target) * 100) : 0,
    rawDays,
    expiredDays,
    dailyNeeded: !expiredDays && rawDays > 0 ? remaining / rawDays : null,
  };
}

export default function SavingPlanCard({ plan, savedAmount, onEdit, showDivider = false }) {
  const display = getSavingPlanDisplay(plan, savedAmount);
  const sharePayload = savingPlanSharePayload(plan, savedAmount);

  return (
    <Pressable
      onPress={() => onEdit(plan)}
      accessibilityRole="button"
      accessibilityLabel={`${plan.name} saving plan. Tap to edit.`}
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.titleRow}>
        <View style={styles.identity}>
          <View style={[styles.iconWrap, { backgroundColor: `${plan.color || colors.border}1F` }]}>
            <SavingPlanIcon value={plan.icon} size={20} color={plan.color || colors.text} />
          </View>
          <View style={styles.nameGoal}>
            <Text style={styles.name} numberOfLines={1}>
              {plan.name}
            </Text>
            <Text
              style={styles.goal}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {money(display.target)}
            </Text>
          </View>
        </View>

        <Text style={styles.percentage} numberOfLines={1}>
          {display.percentage.toFixed(0)}%
        </Text>
        <ShareButton domain="finance" payload={sharePayload} style={styles.share} />
      </View>

      <View
        style={styles.progressTrack}
        accessibilityLabel={`${display.percentage.toFixed(0)}% saved`}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${display.percentage}%`,
              backgroundColor: plan.color || colors.pulsePrimary,
            },
          ]}
        />
      </View>

      <View style={styles.balanceRow}>
        <Text
          style={styles.balanceText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Saved {money(display.saved)}
        </Text>
        <Text
          style={[styles.balanceText, styles.balanceRight]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {money(display.remaining)} left
        </Text>
      </View>

      {display.expiredDays ? (
        <Text style={styles.expired} numberOfLines={1}>
          Expired {display.expiredDays} day{display.expiredDays === 1 ? "" : "s"} ago
        </Text>
      ) : (
        <View style={styles.timingRow}>
          {display.dailyNeeded !== null ? (
            <Text style={styles.timingText} numberOfLines={1}>
              {money(display.dailyNeeded, 2)}/day needed
            </Text>
          ) : <View />}
          <Text style={styles.daysLeft} numberOfLines={1}>
            {Math.max(0, display.rawDays)} days left
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 6,
    gap: 3,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  identity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  nameGoal: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "baseline", gap: 6 },
  name: {
    ...type.title,
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
    flexShrink: 1,
  },
  goal: {
    ...type.caption,
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 0,
    maxWidth: 84,
  },
  percentage: {
    ...type.label,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
    flexShrink: 0,
    textAlign: "right",
  },
  share: { marginLeft: -2 },

  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.rowTint,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: radius.pill },

  balanceRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  balanceText: { ...type.small, color: colors.text, flex: 1 },
  balanceRight: { textAlign: "right" },
  timingRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  timingText: { ...type.caption, fontSize: 10, lineHeight: 13, color: colors.textMuted, flexShrink: 1 },
  daysLeft: {
    ...type.caption,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    flexShrink: 0,
    textAlign: "right",
  },
  expired: { ...type.caption, color: colors.error, fontFamily: fonts.semibold, alignSelf: "flex-end" },
});
