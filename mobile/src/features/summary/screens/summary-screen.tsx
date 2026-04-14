import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DOMAIN_LABELS } from "@velora/shared";

import { Card } from "@/components/ui/card";
import { DomainBadge } from "@/components/ui/domain-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Screen } from "@/components/ui/screen";
import { ScoreRing } from "@/components/ui/score-ring";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusCard } from "@/components/ui/status-card";
import { BalanceWheel } from "@/features/summary/components/balance-wheel";
import { DomainTrendCard } from "@/features/summary/components/domain-trend-card";
import { ScoreChangePill } from "@/features/summary/components/score-change-pill";
import {
  fetchDomainTrendSeries,
  fetchWeeklyDomainSummaries,
  fetchWeeklyLifeSummaries,
  type DomainTrendSeries,
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
  const [domainTrendSeries, setDomainTrendSeries] = useState<DomainTrendSeries[]>([]);

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
          const [nextDomainSummaries, nextDomainTrendSeries] = await Promise.all([
            fetchWeeklyDomainSummaries(user.id, nextSelectedWeek),
            fetchDomainTrendSeries(
              user.id,
              nextLifeSummaries.slice(0, 6).map((summary) => summary.weekStartLocalDate)
            )
          ]);

          if (!isMounted) {
            return;
          }

          setDomainSummaries(nextDomainSummaries);
          setDomainTrendSeries(nextDomainTrendSeries);
        } else {
          setDomainSummaries([]);
          setDomainTrendSeries([]);
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
  const selectedLifeSummaryIndex = lifeSummaries.findIndex(
    (summary) => summary.weekStartLocalDate === selectedWeekStart
  );
  const previousLifeSummary =
    selectedLifeSummaryIndex >= 0 ? lifeSummaries[selectedLifeSummaryIndex + 1] ?? null : null;
  const balanceChange =
    selectedLifeSummary && previousLifeSummary
      ? selectedLifeSummary.balancedLifeScore - previousLifeSummary.balancedLifeScore
      : null;

  return (
    <Screen scrollable>
      <SectionHeader
        eyebrow="Weekly Summary"
        subtitle="Look back at your weekly reviews to see where balance is settling and where it needs more care."
        title="Review your score history."
      />

      {isLoading ? (
        <StatusCard
          loading
          message="Loading your weekly summaries and domain history."
          title="Loading summary history"
          tone="info"
        />
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card variant="highlight">
          <Text style={styles.sectionTitle}>{formatWeekRange(selectedLifeSummary.weekStartLocalDate)}</Text>
          <View style={styles.heroCardContent}>
            <ScoreRing caption="weekly" value={selectedLifeSummary.balancedLifeScore} />
            <View style={styles.heroCardBody}>
              <Text style={styles.heroHeadline}>
                {selectedLifeSummary.isProvisional
                  ? "This week is still forming."
                  : "Your weekly balance is ready."}
              </Text>
              <Text style={styles.helper}>
                Life strength {selectedLifeSummary.lifeStrength.toFixed(1)} • Evenness{" "}
                {selectedLifeSummary.evenness.toFixed(1)}
              </Text>
              <Text style={styles.helper}>
                {selectedLifeSummary.isProvisional ? "Provisional week" : "Official weekly summary"}
              </Text>
              <ScoreChangePill change={balanceChange} label="vs last week" />
            </View>
          </View>
          <View style={styles.badgeRow}>
            {selectedLifeSummary.strongestDomainKey ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeLabel}>Strongest</Text>
                <DomainBadge compact domainKey={selectedLifeSummary.strongestDomainKey} />
              </View>
            ) : null}
            {selectedLifeSummary.weakestDomainKey ? (
              <View style={styles.badgeWrap}>
                <Text style={styles.badgeLabel}>Needs care</Text>
                <DomainBadge compact domainKey={selectedLifeSummary.weakestDomainKey} />
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      {!isLoading && selectedLifeSummary ? (
        <Card>
          <Text style={styles.sectionTitle}>Domain breakdown</Text>
          <Text style={styles.helper}>
            See how this week is spreading across all five areas before you dive into the details.
          </Text>
          <BalanceWheel
            centerCaption="balance"
            centerValue={selectedLifeSummary.balancedLifeScore.toFixed(0)}
            items={domainSummaries.map((summary) => ({
              domainKey: summary.domainKey,
              score: summary.displayedScore
            }))}
          />
          {domainSummaries.map((summary) => (
            <View key={summary.domainKey} style={styles.metricRow}>
              <ProgressBar
                accentColor={domainTheme[summary.domainKey].accent}
                label={DOMAIN_LABELS[summary.domainKey]}
                value={summary.displayedScore}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {!isLoading && domainTrendSeries.length ? (
        <Card>
          <Text style={styles.sectionTitle}>Recent movement</Text>
          <Text style={styles.helper}>
            A quick read on how each area has been moving across your recent weekly reviews.
          </Text>
          {domainTrendSeries.map((series) => {
            const highlightIndex = series.summaries.findIndex(
              (summary) => summary.weekStartLocalDate === selectedWeekStart
            );
            const selectedSummary =
              highlightIndex >= 0
                ? series.summaries[highlightIndex]
                : series.summaries[series.summaries.length - 1] ?? null;
            const previousSummary =
              highlightIndex > 0
                ? series.summaries[highlightIndex - 1]
                : null;
            const delta =
              selectedSummary && previousSummary
                ? selectedSummary.displayedScore - previousSummary.displayedScore
                : null;
            const changeLabel =
              delta == null
                ? "Building a baseline"
                : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs last week`;

            if (!selectedSummary) {
              return null;
            }

            return (
              <DomainTrendCard
                key={series.domainKey}
                changeLabel={changeLabel}
                currentScore={selectedSummary.displayedScore}
                highlightIndex={highlightIndex >= 0 ? highlightIndex : undefined}
                label={DOMAIN_LABELS[series.domainKey]}
                scores={series.summaries.map((summary) => summary.displayedScore)}
              />
            );
          })}
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
                    {summary.isProvisional ? "Provisional" : "Saved"} weekly review
                  </Text>
                </View>
                <Text style={styles.historyValue}>{summary.balancedLifeScore.toFixed(1)}</Text>
              </Pressable>
            );
          })
        ) : (
          <StatusCard
            message="Your first completed week will appear here once you have a full week of check-ins and actions."
            title="No weekly history yet"
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
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  heroCardBody: {
    flex: 1,
    gap: 8
  },
  heroCardContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20
  },
  heroHeadline: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  badgeLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  badgeWrap: {
    gap: 6
  },
  metricRow: {
    gap: 8
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
