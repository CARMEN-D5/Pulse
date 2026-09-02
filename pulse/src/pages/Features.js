// Features tab — the "Tools" menu from the Sprint 4 UI refinement mockup.
//
// Every entry here is a page that already exists elsewhere in the app; this
// screen is purely a launcher, so the routing decisions stay in App.js and are
// reached through the `onOpen` callback with the tool's id.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import Icon from "../components/Icon";
import { Screen } from "../components/ui";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from "../tutorial";

// `id` is what App.js switches on to pick the destination view.
export const TOOLS = [
  { id: "journal",  icon: "sentiment_satisfied", label: "Journal",                   sub: "Spirituality",          gradient: ["#2A7A6A", "#4AA898"] },
  { id: "todo",     icon: "event_note",          label: "To-do List",                sub: "Work & Productivity",   gradient: ["#5A6550", "#7D8A72"] },
  { id: "finance",  icon: "savings",             label: "Budget Tracker",            sub: "Financial Wellbeing",   gradient: ["#8E4570", "#B46098"] },
  { id: "activity", icon: "directions_run",      label: "Physical Activity Tracker", sub: "Health",                gradient: ["#B33D54", "#E0546E"] },
  { id: "missions", icon: "check_box",           label: "Daily Missions",            sub: "Today's three missions", gradient: ["#4A6D98", "#6A8DB8"] },
];

function Features({ onOpen }) {
  useTutorial("features");
  return (
    <Screen
      gradient={false}
      safeArea={false}
      keyboardAvoiding={false}
      contentContainerStyle={styles.screen}
    >
      <TutorialTarget id={TUTORIAL_TARGETS.features.list} style={styles.flex}>
      <View style={[styles.card, shadow("md")]}>
        <Text style={styles.cardTitle}>Tools</Text>
        <View style={styles.rule} />

        {TOOLS.map((tool, i) => (
          <TutorialTarget
            id={
              tool.id === "missions"
                ? TUTORIAL_TARGETS.features.missions
                : `features.tool.${tool.id}`
            }
            key={tool.id}
          >
          <Pressable
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
            <LinearGradient
              colors={tool.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconTile}
            >
              <Icon name={tool.icon} size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{tool.label}</Text>
              <Text style={styles.rowSub}>{tool.sub}</Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.textMuted} />
          </Pressable>
          </TutorialTarget>
        ))}
      </View>
      </TutorialTarget>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pressed: { opacity: 0.7 },
  flex: { flex: 1 },

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

  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowTinted: { backgroundColor: colors.rowTint },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { ...type.title, fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  rowSub: { ...type.small, color: colors.textMuted },
});

export default Features;
