import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import { ACTION_MODULES, type ActionModuleKey } from "@/features/actions/action-modules";
import { theme } from "@/theme/tokens";

const MODULE_GROUPS: Array<{
  accent: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  moduleKeys: ActionModuleKey[];
  title: string;
}> = [
  {
    accent: "#086A69",
    icon: "star-outline",
    moduleKeys: ["journal"],
    title: "Spirituality"
  },
  {
    accent: "#4E607F",
    icon: "account-group-outline",
    moduleKeys: ["connection"],
    title: "Family and Friends"
  },
  {
    accent: "#50624C",
    icon: "briefcase-outline",
    moduleKeys: ["task", "focus"],
    title: "Work/Productivity"
  },
  {
    accent: "#1E8E82",
    icon: "heart-pulse",
    moduleKeys: ["activity", "sleep"],
    title: "Health"
  },
  {
    accent: "#983F72",
    icon: "cash-multiple",
    moduleKeys: ["expense", "financial"],
    title: "Financial Wellbeing"
  }
];

export function ActionsHubScreen() {
  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Action Modules</Text>
        <Text style={styles.title}>Capture score-driving actions across all five domains.</Text>
        <Text style={styles.copy}>
          Choose the part of life you want to support today, then log one concrete action.
        </Text>
      </View>

      {MODULE_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupIcon, { backgroundColor: `${group.accent}18` }]}>
              <MaterialCommunityIcons color={group.accent} name={group.icon} size={18} />
            </View>
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>

          {group.moduleKeys.map((moduleKey) => (
            <Pressable
              key={moduleKey}
              onPress={() => router.push(`/(app)/actions/${moduleKey}`)}
              style={styles.pressable}
            >
              <Card>
                <Text style={styles.cardTitle}>{ACTION_MODULES[moduleKey].title}</Text>
                <Text style={styles.cardSummary}>{ACTION_MODULES[moduleKey].description}</Text>
                <Text style={[styles.cardStatus, { color: group.accent }]}>Open module</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      <StatusCard
        message="If a save fails while you are offline, reopen the module once your connection returns and retry the entry."
        title="Offline-tolerant behavior"
        tone="info"
      />

      <Card>
        <Text style={styles.cardTitle}>Today’s rhythm</Text>
        <Text style={styles.cardSummary}>
          The fastest way to feel progress is to log one small action in the domain that needs the
          most care this week.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 4
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24
  },
  group: {
    gap: 12
  },
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  groupIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  cardSummary: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: "600"
  },
  pressable: {
    borderRadius: 20
  }
});
