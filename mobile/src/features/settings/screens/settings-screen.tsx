import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { signOut } from "@/features/auth/services/auth-service";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";

export function SettingsScreen() {
  const { user } = useAuthSession();
  const { profile } = useProfile();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>Account and scoring setup</Text>
        <Text style={styles.copy}>
          Your fixed scoring timezone and onboarding baseline are what make the weekly summaries
          consistent over time.
        </Text>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.rowLabel}>Display name</Text>
        <Text style={styles.rowValue}>{profile?.displayName ?? "Not set"}</Text>
        <Text style={styles.rowLabel}>Email</Text>
        <Text style={styles.rowValue}>{user?.email ?? user?.id ?? "Unavailable"}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Scoring</Text>
        <Text style={styles.rowLabel}>Timezone</Text>
        <Text style={styles.rowValue}>{profile?.scoringTimezone ?? "Not configured"}</Text>
        <Text style={styles.rowLabel}>Onboarding</Text>
        <Text style={styles.rowValue}>
          {profile?.onboardingCompletedAt ? "Completed" : "Still required"}
        </Text>
        <Text style={styles.rowLabel}>Current streak</Text>
        <Text style={styles.rowValue}>{profile?.currentStreakDays ?? 0} days</Text>
      </Card>

      <Button onPress={handleSignOut} tone="secondary">
        Sign out
      </Button>
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
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  copy: {
    color: "#b8c2dc",
    fontSize: 16,
    lineHeight: 24
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  rowLabel: {
    color: "#8f99b3",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  rowValue: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 24
  }
});
