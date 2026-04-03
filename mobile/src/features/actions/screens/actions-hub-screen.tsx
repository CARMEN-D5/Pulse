import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";

const ACTION_MODULES = [
  { title: "Journal", status: "Next implementation slice", summary: "Spirituality reflection entries." },
  { title: "Connection Log", status: "Next implementation slice", summary: "Meaningful social moments." },
  { title: "Tasks", status: "Next implementation slice", summary: "Important work and study completions." },
  { title: "Focus Session", status: "Next implementation slice", summary: "Timed deep work sessions." },
  { title: "Activity", status: "Next implementation slice", summary: "Exercise and movement logs." },
  { title: "Sleep", status: "Next implementation slice", summary: "Sleep duration and wake-day scoring." },
  { title: "Expense", status: "Next implementation slice", summary: "Quick financial awareness logs." },
  { title: "Budget / Savings", status: "Next implementation slice", summary: "Review or saving actions." }
] as const;

export function ActionsHubScreen() {
  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Action Modules</Text>
        <Text style={styles.title}>The actions hub is wired into the V1 navigation now.</Text>
        <Text style={styles.copy}>
          The next commit will turn these modules into working create and review flows on top of the
          Supabase tables that already normalize into score events.
        </Text>
      </View>

      {ACTION_MODULES.map((module) => (
        <Card key={module.title}>
          <Text style={styles.cardTitle}>{module.title}</Text>
          <Text style={styles.cardSummary}>{module.summary}</Text>
          <Text style={styles.cardStatus}>{module.status}</Text>
        </Card>
      ))}

      <Card>
        <Text style={styles.cardTitle}>Current V1 focus</Text>
        <Text style={styles.cardSummary}>
          Account creation, onboarding, daily check-ins, dashboard reads, summary history, and
          settings are now the active end-to-end foundation.
        </Text>
        <Link href="/(app)/(tabs)/check-in" style={styles.link}>
          Open today&apos;s check-in
        </Link>
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
  link: {
    color: "#8ba3ff",
    fontSize: 15,
    fontWeight: "700"
  }
});
