import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ACTION_MODULES, type ActionModuleKey } from "@/features/actions/action-modules";

const MODULE_ORDER: ActionModuleKey[] = [
  "journal",
  "connection",
  "task",
  "focus",
  "activity",
  "sleep",
  "expense",
  "financial"
];

export function ActionsHubScreen() {
  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Action Modules</Text>
        <Text style={styles.title}>Capture score-driving actions across all five domains.</Text>
        <Text style={styles.copy}>
          Each module writes to a dedicated Supabase table and the backend normalizes those records
          into the score ledger automatically.
        </Text>
      </View>

      {MODULE_ORDER.map((moduleKey) => (
        <Pressable
          key={moduleKey}
          onPress={() => router.push(`/(app)/actions/${moduleKey}`)}
          style={styles.pressable}
        >
          <Card>
            <Text style={styles.cardTitle}>{ACTION_MODULES[moduleKey].title}</Text>
            <Text style={styles.cardSummary}>{ACTION_MODULES[moduleKey].description}</Text>
            <Text style={styles.cardStatus}>Open module</Text>
          </Card>
        </Pressable>
      ))}

      <Card>
        <Text style={styles.cardTitle}>Current V1 focus</Text>
        <Text style={styles.cardSummary}>
          You can now navigate from the hub into real V1 score-input flows. The next remaining work
          is polish, edit/delete refinement, and release hardening.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 24
  },
  eyebrow: {
    color: "#8ba3ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34
  },
  copy: {
    color: "#b8c2dc",
    fontSize: 16,
    lineHeight: 24
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  cardSummary: {
    color: "#ccd4ea",
    fontSize: 15,
    lineHeight: 22
  },
  cardStatus: {
    color: "#8ba3ff",
    fontSize: 13,
    fontWeight: "600"
  },
  pressable: {
    borderRadius: 20
  }
});
