import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DOMAIN_LABELS } from "@velora/shared";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import {
  fetchWeeklyDomainSummaries,
  fetchWeeklyLifeSummaries,
  type WeeklyDomainSummary,
  type WeeklyLifeSummary
} from "@/features/summary/services/summary-service";
import { formatWeekRange } from "@/lib/date-time";
import { toHelpfulErrorMessage } from "@/lib/errors";
import { useAuthSession } from "@/providers/auth-session-provider";
import { domainTheme, theme } from "@/theme/tokens";

export function SummaryScreen() {
  const { user } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lifeSummaries, setLifeSummaries] = useState<WeeklyLifeSummary[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(null);
  const [domainSummaries, setDomainSummaries] = useState<WeeklyDomainSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadSummaryHistory() {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextLifeSummaries = await fetchWeeklyLifeSummaries(user.id);

        if (!isMounted) {
          return;
        }

        setLifeSummaries(nextLifeSummaries);

        const nextSelectedWeek = nextLifeSummaries[0]?.weekStartLocalDate ?? null;
        setSelectedWeekStart(nextSelectedWeek);

        if (nextSelectedWeek) {
          const nextDomainSummaries = await fetchWeeklyDomainSummaries(user.id, nextSelectedWeek);

          if (!isMounted) {
            return;
          }

          setDomainSummaries(nextDomainSummaries);
        } else {
          setDomainSummaries([]);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(toHelpfulErrorMessage(error, "Unable to load summary history."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSummaryHistory();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function handleSelectWeek(weekStartLocalDate: string) {
    if (!user?.id) {
      return;
    }

    setSelectedWeekStart(weekStartLocalDate);
    const nextDomainSummaries = await fetchWeeklyDomainSummaries(user.id, weekStartLocalDate);
    setDomainSummaries(nextDomainSummaries);
  }

  const selectedLifeSummary =
    lifeSummaries.find((summary) => summary.weekStartLocalDate === selectedWeekStart) ?? null;

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Weekly Summary</Text>
        <Text style={styles.title}>Review your official score history.</Text>
        <Text style={styles.copy}>
          Weekly reviews help you see whether your attention is becoming more balanced over time.
        </Text>
      </View>

      {isLoading ? (
        <StatusCard
          loading
          message="Fetching official weekly summaries and domain history."
          title="Loading summary history"
          tone="info"
        />
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card variant="highlight">
          <Text style={styles.sectionTitle}>{formatWeekRange(selectedLifeSummary.weekStartLocalDate)}</Text>
          <Text style={styles.heroScore}>{selectedLifeSummary.balancedLifeScore.toFixed(1)}</Text>
          <Text style={styles.helper}>
            Life strength {selectedLifeSummary.lifeStrength.toFixed(1)} • Evenness{" "}
            {selectedLifeSummary.evenness.toFixed(1)}
          </Text>
          <Text style={styles.helper}>
            {selectedLifeSummary.isProvisional ? "Provisional week" : "Official weekly summary"}
          </Text>
          <Text style={styles.helper}>
            Strongest:{" "}
            {selectedLifeSummary.strongestDomainKey
              ? DOMAIN_LABELS[selectedLifeSummary.strongestDomainKey]
              : "N/A"}
          </Text>
          <Text style={styles.helper}>
            Weakest:{" "}
            {selectedLifeSummary.weakestDomainKey
              ? DOMAIN_LABELS[selectedLifeSummary.weakestDomainKey]
              : "N/A"}
          </Text>
        </Card>
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card>
          <Text style={styles.sectionTitle}>Domain breakdown</Text>
          {domainSummaries.map((summary) => (
            <View key={summary.domainKey} style={styles.metricRow}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>{DOMAIN_LABELS[summary.domainKey]}</Text>
                <Text style={styles.metricValue}>{summary.displayedScore.toFixed(0)}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: domainTheme[summary.domainKey].accent,
                      width: `${Math.max(8, Math.min(100, summary.displayedScore))}%`
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>History</Text>
        {lifeSummaries.length ? (
          lifeSummaries.map((summary) => {
            const isSelected = summary.weekStartLocalDate === selectedWeekStart;

            return (
              <Pressable
                key={summary.weekStartLocalDate}
                onPress={() => void handleSelectWeek(summary.weekStartLocalDate)}
                style={[styles.historyItem, isSelected ? styles.historyItemSelected : null]}
              >
                <View>
                  <Text style={styles.historyTitle}>{formatWeekRange(summary.weekStartLocalDate)}</Text>
                  <Text style={styles.historyMeta}>
                    {summary.isProvisional ? "Provisional" : "Official"} weekly score
                  </Text>
                </View>
                <Text style={styles.historyValue}>{summary.balancedLifeScore.toFixed(1)}</Text>
              </Pressable>
            );
          })
        ) : (
          <StatusCard
            message="Your first closed week will appear here after backend finalization."
            title="No official history yet"
            tone="neutral"
          />
        )}
      </Card>

      {errorMessage ? (
        <StatusCard message={errorMessage} title="Summary unavailable" tone="error" />
      ) : null}
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  heroScore: {
    color: theme.colors.primary,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 50
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  metricRow: {
    gap: 8
  },
  metricHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metricLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  progressTrack: {
    backgroundColor: "rgba(8, 106, 105, 0.08)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: 999,
    height: "100%"
  },
  historyItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  historyItemSelected: {
    borderColor: "rgba(8, 106, 105, 0.24)",
    backgroundColor: "rgba(156, 235, 232, 0.34)"
  },
  historyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  historyMeta: {
    color: theme.colors.textSoft,
    fontSize: 13
  },
  historyValue: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: "800"
  }
});
