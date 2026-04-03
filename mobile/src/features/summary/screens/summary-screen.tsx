import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { DOMAIN_LABELS } from "@velora/shared";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { ScoreChangePill } from "@/features/summary/components/score-change-pill";
import { ScoreProgressBar } from "@/features/summary/components/score-progress-bar";
import {
  fetchWeeklyDomainSummaries,
  fetchWeeklyLifeSummaries,
  type WeeklyDomainSummary,
  type WeeklyLifeSummary
} from "@/features/summary/services/summary-service";
import { formatWeekRange } from "@/lib/date-time";
import { useAuthSession } from "@/providers/auth-session-provider";

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

        setErrorMessage(error instanceof Error ? error.message : "Unable to load summary history.");
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
  const selectedSummaryIndex = lifeSummaries.findIndex(
    (summary) => summary.weekStartLocalDate === selectedWeekStart
  );
  const previousLifeSummary =
    selectedSummaryIndex >= 0 ? lifeSummaries[selectedSummaryIndex + 1] ?? null : null;
  const scoreDelta =
    selectedLifeSummary && previousLifeSummary
      ? selectedLifeSummary.balancedLifeScore - previousLifeSummary.balancedLifeScore
      : null;

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Weekly Summary</Text>
        <Text style={styles.title}>Review your official score history.</Text>
        <Text style={styles.copy}>
          This screen reads directly from the persisted weekly summary tables, not from temporary
          client-side calculations.
        </Text>
      </View>

      {isLoading ? (
        <Card>
          <ActivityIndicator color="#8ba3ff" />
          <Text style={styles.helper}>Loading official weekly summaries...</Text>
        </Card>
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card>
          <Text style={styles.sectionTitle}>{formatWeekRange(selectedLifeSummary.weekStartLocalDate)}</Text>
          <Text style={styles.heroScore}>{selectedLifeSummary.balancedLifeScore.toFixed(1)}</Text>
          <ScoreChangePill change={scoreDelta} />
          <Text style={styles.helper}>
            Life strength {selectedLifeSummary.lifeStrength.toFixed(1)} • Evenness{" "}
            {selectedLifeSummary.evenness.toFixed(1)}
          </Text>
          <Text style={styles.helper}>
            {selectedLifeSummary.isProvisional ? "Provisional week" : "Official weekly summary"}
          </Text>
          <Text style={styles.helper}>
            Strongest: {selectedLifeSummary.strongestDomainKey ? DOMAIN_LABELS[selectedLifeSummary.strongestDomainKey] : "N/A"}
          </Text>
          <Text style={styles.helper}>
            Weakest: {selectedLifeSummary.weakestDomainKey ? DOMAIN_LABELS[selectedLifeSummary.weakestDomainKey] : "N/A"}
          </Text>
        </Card>
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card>
          <Text style={styles.sectionTitle}>Domain breakdown</Text>
          {domainSummaries.map((summary) => (
            <View key={summary.domainKey} style={styles.domainBlock}>
              <ScoreProgressBar
                detail={
                  summary.isProvisional
                    ? "Provisional domain score"
                    : `Reflection ${summary.reflectionScore?.toFixed(1) ?? "N/A"} • Action ${summary.actionScore.toFixed(1)} • Consistency ${summary.consistencyScore.toFixed(1)}`
                }
                label={DOMAIN_LABELS[summary.domainKey]}
                score={summary.displayedScore}
              />
              <View style={styles.metricPillRow}>
                <View style={styles.metricPill}>
                  <Text style={styles.metricPillLabel}>Active days</Text>
                  <Text style={styles.metricPillValue}>{summary.activeDaysInWindow}</Text>
                </View>
                <View style={styles.metricPill}>
                  <Text style={styles.metricPillLabel}>Reflection days</Text>
                  <Text style={styles.metricPillValue}>{summary.reflectionDaysCount}</Text>
                </View>
                <View style={styles.metricPill}>
                  <Text style={styles.metricPillLabel}>Current score</Text>
                  <Text style={styles.metricPillValue}>{summary.currentComputedScore.toFixed(1)}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>History</Text>
        {lifeSummaries.length ? (
          lifeSummaries.map((summary, index) => {
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
                <View style={styles.historyRight}>
                  <Text style={styles.historyValue}>{summary.balancedLifeScore.toFixed(1)}</Text>
                  <Text style={styles.historyDelta}>
                    {(() => {
                      const nextSummary = lifeSummaries[index + 1];

                      if (!nextSummary) {
                        return "No prior week";
                      }

                      const delta = summary.balancedLifeScore - nextSummary.balancedLifeScore;
                      const rounded = Math.round(delta * 10) / 10;
                      const sign = rounded > 0 ? "+" : "";
                      return `${sign}${rounded.toFixed(1)}`;
                    })()}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.helper}>
            No official summary history is available yet. Your first closed week will appear here
            after backend finalization.
          </Text>
        )}
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
  heroScore: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 50
  },
  helper: {
    color: "#a7b2cd",
    fontSize: 14,
    lineHeight: 20
  },
  domainBlock: {
    gap: 12
  },
  metricPillRow: {
    flexDirection: "row",
    gap: 10
  },
  metricPill: {
    backgroundColor: "#10141d",
    borderColor: "#293040",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  metricPillLabel: {
    color: "#93a0bf",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricPillValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  historyItem: {
    alignItems: "center",
    backgroundColor: "#10141d",
    borderColor: "#2a3140",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  historyItemSelected: {
    borderColor: "#7a94ff",
    backgroundColor: "#131b2a"
  },
  historyTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  historyMeta: {
    color: "#95a1be",
    fontSize: 13
  },
  historyRight: {
    alignItems: "flex-end",
    gap: 4
  },
  historyValue: {
    color: "#8ba3ff",
    fontSize: 18,
    fontWeight: "800"
  },
  historyDelta: {
    color: "#9cb0da",
    fontSize: 12,
    fontWeight: "700"
  },
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  }
});
