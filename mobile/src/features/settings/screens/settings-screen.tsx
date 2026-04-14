import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

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
        <Text style={styles.helper}>
          Keep this information current so your daily rhythm stays personal and easy to recognize.
        </Text>
        <View style={styles.infoBlock}>
          <Text style={styles.rowLabel}>Display name</Text>
          <Text style={styles.rowValue}>{profile?.displayName ?? "Not set"}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue}>{user?.email ?? user?.id ?? "Unavailable"}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Scoring</Text>
        <Text style={styles.helper}>
          These details shape how your weekly reviews are timed and how your progress is carried forward.
        </Text>
        <View style={styles.infoBlock}>
          <Text style={styles.rowLabel}>Timezone</Text>
          <Text style={styles.rowValue}>{profile?.scoringTimezone ?? "Not configured"}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.rowLabel}>Onboarding</Text>
          <View
            style={[
              styles.statusPill,
              profile?.onboardingCompletedAt ? styles.statusPillSuccess : styles.statusPillMuted
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                profile?.onboardingCompletedAt
                  ? styles.statusPillTextSuccess
                  : styles.statusPillTextMuted
              ]}
            >
              {profile?.onboardingCompletedAt ? "Completed" : "Still required"}
            </Text>
          </View>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.rowLabel}>Current streak</Text>
          <Text style={styles.rowValue}>{profile?.currentStreakDays ?? 0} days</Text>
        </View>
      </Card>

      <Button onPress={handleSignOut} tone="danger">
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
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  infoBlock: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14
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
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusPillMuted: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderMuted
  },
  statusPillSuccess: {
    backgroundColor: "rgba(47, 140, 104, 0.12)",
    borderColor: "rgba(47, 140, 104, 0.18)"
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700"
  },
  statusPillTextMuted: {
    color: theme.colors.textMuted
  },
  statusPillTextSuccess: {
    color: theme.colors.success
  }
});
