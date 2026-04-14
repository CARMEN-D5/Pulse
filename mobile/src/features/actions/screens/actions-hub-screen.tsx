import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { type DomainKey } from "@velora/shared";

import { Card } from "@/components/ui/card";
import { DomainBadge } from "@/components/ui/domain-badge";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusCard } from "@/components/ui/status-card";
import { ACTION_MODULES, type ActionModuleKey } from "@/features/actions/action-modules";
import { domainTheme, theme } from "@/theme/tokens";

const MODULE_GROUPS: Array<{
  domainKey: DomainKey;
  moduleKeys: ActionModuleKey[];
  title: string;
}> = [
  {
    domainKey: "spirituality",
    moduleKeys: ["journal"],
    title: "Spirituality"
  },
  {
    domainKey: "family_friends",
    moduleKeys: ["connection"],
    title: "Family and Friends"
  },
  {
    domainKey: "work_productivity",
    moduleKeys: ["task", "focus"],
    title: "Work/Productivity"
  },
  {
    domainKey: "health",
    moduleKeys: ["activity", "sleep"],
    title: "Health"
  },
  {
    domainKey: "financial_wellbeing",
    moduleKeys: ["expense", "financial"],
    title: "Financial Wellbeing"
  }
];

export function ActionsHubScreen() {
  return (
    <Screen scrollable>
      <SectionHeader
        eyebrow="Action Modules"
        subtitle="Choose the part of life you want to support today, then capture one concrete step."
        title="Log one meaningful action in any life area."
      />

      {MODULE_GROUPS.map((group) => (
        <View key={group.title} style={styles.group}>
          <DomainBadge domainKey={group.domainKey} />

          {group.moduleKeys.map((moduleKey) => (
            <Pressable
              key={moduleKey}
              onPress={() => router.push(`/(app)/actions/${moduleKey}`)}
              style={styles.pressable}
            >
              <Card>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{ACTION_MODULES[moduleKey].title}</Text>
                  <View
                    style={[
                      styles.cardPill,
                      { backgroundColor: domainTheme[group.domainKey].soft }
                    ]}
                  >
                    <Text style={[styles.cardStatus, { color: domainTheme[group.domainKey].accent }]}>
                      Open
                    </Text>
                    <MaterialCommunityIcons
                      color={domainTheme[group.domainKey].accent}
                      name="arrow-right"
                      size={14}
                    />
                  </View>
                </View>
                <Text style={styles.cardSummary}>{ACTION_MODULES[moduleKey].description}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      <StatusCard
        message="If a save fails while you are offline, reopen the module once your connection returns and retry the entry."
        title="If you lose connection"
        tone="info"
      />

      <Card>
        <Text style={styles.cardTitle}>Start small</Text>
        <Text style={styles.cardSummary}>
          The fastest way to feel progress is to log one small action in the domain that needs the
          most care this week.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  cardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardPill: {
    alignItems: "center",
    borderRadius: theme.radii.pill,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  cardSummary: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: "600"
  },
  pressable: {
    borderRadius: 20
  }
});
