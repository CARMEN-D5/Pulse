import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        subtitle="Choose the part of life you want to support today, then log one concrete action."
        title="Capture score-driving actions across all five domains."
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
                <Text style={styles.cardTitle}>{ACTION_MODULES[moduleKey].title}</Text>
                <Text style={styles.cardSummary}>{ACTION_MODULES[moduleKey].description}</Text>
                <Text style={[styles.cardStatus, { color: domainTheme[group.domainKey].accent }]}>
                  Open module
                </Text>
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
  group: {
    gap: 12
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
