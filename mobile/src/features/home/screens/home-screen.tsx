import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { DOMAIN_LABELS, type DomainKey } from "@velora/shared";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { fetchLatestDashboardSnapshot, type DashboardSnapshot } from "@/features/summary/services/summary-service";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";

export function HomeScreen() {
  const { user } = useAuthSession();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextSnapshot = await fetchLatestDashboardSnapshot(user.id);

        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load the dashboard.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const greetingName = profile?.displayName ?? "there";

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>VELORA</Text>
        <Text style={styles.title}>Good to see you, {greetingName}.</Text>
        <Text style={styles.copy}>
          Your home view is now connected to the official weekly summary tables in Supabase.
        </Text>
      </View>

      <Card style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Balanced Life Score</Text>
        {isLoading ? (
          <ActivityIndicator color="#8ba3ff" />
        ) : snapshot?.lifeSummary ? (
          <>
            <Text style={styles.scoreValue}>
              {snapshot.lifeSummary.balancedLifeScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreMeta}>
              Week of {snapshot.lifeSummary.weekStartLocalDate}
            </Text>
          </>
        ) : (
          <Text style={styles.emptyCopy}>Your first official weekly summary will appear here.</Text>
        )}
      </Card>

      <View style={styles.quickGrid}>
        <Card style={styles.quickCard}>
          <Text style={styles.quickTitle}>Strongest domain</Text>
          <Text style={styles.quickValue}>
            {snapshot?.lifeSummary?.strongestDomainKey
              ? DOMAIN_LABELS[snapshot.lifeSummary.strongestDomainKey]
              : "Not available yet"}
          </Text>
        </Card>
        <Card style={styles.quickCard}>
          <Text style={styles.quickTitle}>Weakest domain</Text>
          <Text style={styles.quickValue}>
            {snapshot?.lifeSummary?.weakestDomainKey
              ? DOMAIN_LABELS[snapshot.lifeSummary.weakestDomainKey]
              : "Not available yet"}
          </Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Latest domain scores</Text>
        {isLoading ? <Text style={styles.itemCopy}>Loading domain summaries...</Text> : null}
        {!isLoading && snapshot?.domainSummaries.length
          ? snapshot.domainSummaries.map((summary) => (
              <View key={summary.domainKey} style={styles.metricRow}>
                <Text style={styles.itemLabel}>{DOMAIN_LABELS[summary.domainKey]}</Text>
                <Text style={styles.itemValue}>{summary.displayedScore.toFixed(1)}</Text>
              </View>
            ))
          : null}
        {!isLoading && !snapshot?.domainSummaries.length ? (
          <Text style={styles.itemCopy}>
            There is no official weekly domain summary yet. Keep using check-ins and action logs so
            the backend can finalize your first week.
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Link href="/(app)/(tabs)/check-in" style={styles.link}>
          Open today&apos;s check-in
        </Link>
        <Link href="/(app)/(tabs)/summary" style={styles.link}>
          Review weekly summary history
        </Link>
        <Link href="/(app)/(tabs)/actions" style={styles.link}>
          Open the actions hub
        </Link>
      </Card>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
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
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  copy: {
    color: "#b8c2dc",
    fontSize: 16,
    lineHeight: 24
  },
  scoreCard: {
    alignItems: "center",
    marginBottom: 16
  },
  scoreLabel: {
    color: "#a9b5d4",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  scoreValue: {
    color: "#ffffff",
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 60
  },
  scoreMeta: {
    color: "#8f99b3",
    fontSize: 14
  },
  emptyCopy: {
    color: "#ccd4ea",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  quickCard: {
    flex: 1
  },
  quickTitle: {
    color: "#98a5c7",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  quickValue: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  metricRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  itemLabel: {
    color: "#d8def0",
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  itemValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  itemCopy: {
    color: "#aab4cf",
    fontSize: 14,
    lineHeight: 20
  },
  link: {
    color: "#8ba3ff",
    fontSize: 15,
    fontWeight: "700"
  },
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  }
});
