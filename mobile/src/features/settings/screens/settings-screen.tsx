import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { signOut } from "@/features/auth/services/auth-service";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";
import { theme } from "@/theme/tokens";

export function SettingsScreen() {
  const { user } = useAuthSession();
  const { profile } = useProfile();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  return (
    <Screen scrollable>
      <SectionHeader
        eyebrow="Settings"
        subtitle="Keep your profile clear and your scoring setup steady so each weekly review stays meaningful."
        title="Account and scoring setup"
      />

      <Card variant="highlight">
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  rowLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 24
  }
});
