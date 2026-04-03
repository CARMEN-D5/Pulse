import { Text, View, StyleSheet } from "react-native";

import { DOMAIN_KEYS, DOMAIN_LABELS } from "@velora/shared";

import { Screen } from "@/components/ui/screen";
import { useAuthSession } from "@/providers/auth-session-provider";

export function HomeScreen() {
  const { isLoading, user } = useAuthSession();

  const authStatus = isLoading ? "Checking Supabase session..." : user ? "Signed in" : "Signed out";

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>VELORA Phase 0</Text>
        <Text style={styles.title}>Mobile, backend, and shared workspaces are scaffolded.</Text>
        <Text style={styles.copy}>
          This screen is still a placeholder shell, but the mobile app now has a Supabase session
          boundary. The next phase is wiring auth screens, onboarding, and the daily check-in flow.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session status</Text>
        <Text style={styles.listItem}>{authStatus}</Text>
        {user ? <Text style={styles.listItem}>{user.email ?? user.id}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Locked score domains</Text>
        {DOMAIN_KEYS.map((domainKey) => (
          <Text key={domainKey} style={styles.listItem}>
            • {DOMAIN_LABELS[domainKey]}
          </Text>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 28
  },
  eyebrow: {
    color: "#8ba3ff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  copy: {
    color: "#b6bed6",
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    backgroundColor: "#171a22",
    borderColor: "#272c38",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600"
  },
  listItem: {
    color: "#d8def0",
    fontSize: 15,
    lineHeight: 22
  }
});
