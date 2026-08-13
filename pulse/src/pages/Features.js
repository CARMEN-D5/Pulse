// Features tab — the "Tools" menu from the Sprint 4 UI refinement mockup.
//
// Every entry here is a page that already exists elsewhere in the app; this
// screen is purely a launcher, so the routing decisions stay in App.js and are
// reached through the `onOpen` callback with the tool's id.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Icon from "../components/Icon";
import { Screen } from "../components/ui";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";

// `id` is what App.js switches on to pick the destination view.
export const TOOLS = [
  { id: "journal",  icon: "sentiment_satisfied", label: "Journal",                   sub: "Spirituality" },
  { id: "todo",     icon: "event_note",          label: "To-do List",                sub: "Work & Productivity" },
  { id: "finance",  icon: "savings",             label: "Budget Tracker",            sub: "Financial Wellbeing" },
  { id: "activity", icon: "directions_run",      label: "Physical Activity Tracker", sub: "Health" },
  { id: "missions", icon: "check_box",           label: "Daily Missions",            sub: "Today's three missions" },
];

function Features({ onOpen }) {
  return (
    <Screen
      gradient={false}
      safeArea={false}
      keyboardAvoiding={false}
      contentContainerStyle={styles.screen}
    >
      <View style={[styles.card, shadow("md")]}>
        <Text style={styles.cardTitle}>Tools</Text>
        <View style={styles.rule} />

        {TOOLS.map((tool, i) => (
          <Pressable
            key={tool.id}
            onPress={() => onOpen?.(tool.id)}
            accessibilityRole="button"
            accessibilityLabel={`${tool.label}, ${tool.sub}`}
            style={({ pressed }) => [
              styles.row,
              // The mockup alternates a faint rose tint down the list.
              i % 2 === 1 && styles.rowTinted,
              pressed && styles.pressed,
            ]}
          >
            <Icon name={tool.icon} size={24} color={colors.text} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{tool.label}</Text>
              <Text style={styles.rowSub}>{tool.sub}</Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pressed: { opacity: 0.7 },

  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  cardTitle: {
    ...type.h3,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    paddingHorizontal: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowTinted: { backgroundColor: colors.rowTint },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { ...type.title, fontFamily: fonts.medium, fontSize: 17, color: colors.text },
  rowSub: { ...type.small, color: colors.textMuted },
});

export default Features;
