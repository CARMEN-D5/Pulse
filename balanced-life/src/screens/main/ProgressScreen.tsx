/**
 * ProgressScreen — Score trend charts, domain breakdown, and mood history.
 * Accepts optional domainId param to auto-select a domain from Dashboard.
 */
import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRoute, RouteProp } from "@react-navigation/native";

import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { DOMAINS, DomainId, DOMAIN_IDS } from "../../config/domains";
import { getScoreTier } from "../../config/scoring";
import { EmptyState, Card } from "../../shared/components";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { TimeRangeToggle } from "../../features/progress/components/TimeRangeToggle";
import { DomainChips } from "../../features/progress/components/DomainChips";
import { TrendLineChart } from "../../features/progress/components/TrendLineChart";
import { StatsSummary } from "../../features/progress/components/StatsSummary";
import {
  TimeRange,
  DailySnapshot,
  fetchSnapshots,
  toBalanceScoreData,
  toDomainData,
} from "../../features/progress/services/progressService";
import { MoodHistory } from "../../features/mood/components/MoodHistory";
import { fetchMoodHistory } from "../../features/mood/services/moodService";
import { MoodDataPoint } from "../../features/mood/types/mood.types";
import { MainTabParamList } from "../../shared/types/navigation.types";

export function ProgressScreen() {
  const { user } = useAuthStore();
  const route = useRoute<RouteProp<MainTabParamList, "Progress">>();
  const incomingDomainId = route.params?.domainId as DomainId | undefined;

  const [range, setRange] = useState<TimeRange>("7d");
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [moodData, setMoodData] = useState<MoodDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-select domain when navigated from Dashboard radar chart
  useEffect(() => {
    if (incomingDomainId && DOMAIN_IDS.includes(incomingDomainId)) {
      setSelectedDomain(incomingDomainId);
    }
  }, [incomingDomainId]);

  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, moods] = await Promise.all([
        fetchSnapshots(user.uid, range),
        fetchMoodHistory(user.uid, rangeDays),
      ]);
      setSnapshots(data);
      setMoodData(moods);
    } catch (error) {
      console.error("Failed to fetch progress data:", error);
    } finally {
      setLoading(false);
    }
  }, [user, range, rangeDays]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hasData = snapshots.length > 0;

  // Get latest and first domain scores for the merged view
  const latestSnapshot = hasData ? snapshots[snapshots.length - 1] : null;
  const firstSnapshot = hasData ? snapshots[0] : null;

  // Find strongest & weakest
  let strongest: string | null = null;
  let weakest: string | null = null;
  if (latestSnapshot) {
    const sorted = [...DOMAIN_IDS].sort(
      (a, b) => (latestSnapshot.domainScores[b] ?? 0) - (latestSnapshot.domainScores[a] ?? 0)
    );
    strongest = sorted[0];
    weakest = sorted[sorted.length - 1];
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>Track your balance over time</Text>

        {/* Time range toggle */}
        <TimeRangeToggle selected={range} onSelect={setRange} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : !hasData ? (
          <EmptyState
            icon="📊"
            title="No Progress Data Yet"
            message="Check in for a few days to see your trends appear here. Charts and insights will update over time."
          />
        ) : (
          <>
            {/* Stats summary */}
            <StatsSummary snapshots={snapshots} />

            {/* Domain filter chips */}
            <DomainChips selected={selectedDomain} onSelect={setSelectedDomain} />

            {/* Charts */}
            {selectedDomain === null ? (
              <TrendLineChart
                title="Balance Score"
                data={toBalanceScoreData(snapshots, range)}
                color={COLORS.primary}
                showArea
              />
            ) : (
              <TrendLineChart
                title={DOMAINS[selectedDomain].label}
                data={toDomainData(snapshots, selectedDomain, range)}
                color={DOMAINS[selectedDomain].color}
                showArea
              />
            )}

            {/* Mood History */}
            {selectedDomain === null && (
              <View style={styles.moodSection}>
                <MoodHistory data={moodData} />
              </View>
            )}

            {/* Life Domains — merged with trend data */}
            {selectedDomain === null && latestSnapshot && firstSnapshot && (
              <View style={styles.domainSection}>
                <Text style={styles.sectionTitle}>Life Domains</Text>
                {DOMAIN_IDS.map((id) => {
                  const domain = DOMAINS[id];
                  const score = latestSnapshot.domainScores[id] ?? 0;
                  const firstScore = firstSnapshot.domainScores[id] ?? 0;
                  const change = Math.round((score - firstScore) * 10) / 10;
                  const tier = getScoreTier(score);
                  const isStrongest = id === strongest;
                  const isWeakest = id === weakest;

                  return (
                    <Card key={id} style={styles.domainCard}>
                      <View style={styles.domainRow}>
                        <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
                        <View style={styles.domainInfo}>
                          <View style={styles.domainNameRow}>
                            <Text style={styles.domainLabel}>{domain.label}</Text>
                            {isStrongest && (
                              <Text style={styles.badgeStrong}>Strongest</Text>
                            )}
                            {isWeakest && (
                              <Text style={styles.badgeWeak}>Focus</Text>
                            )}
                          </View>
                          <View style={styles.barBg}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${Math.max(score, 2)}%` as any,
                                  backgroundColor: domain.color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.domainScoreCol}>
                          <Text style={[styles.domainScore, { color: tier.color }]}>
                            {score}
                          </Text>
                          {change !== 0 && (
                            <Text
                              style={[
                                styles.domainChange,
                                { color: change > 0 ? COLORS.success : COLORS.error },
                              ]}
                            >
                              {change > 0 ? "+" : ""}{change}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  moodSection: {
    marginBottom: SPACING.md,
  },
  // Life Domains
  domainSection: {
    gap: SPACING.sm,
  },
  domainCard: {
    paddingVertical: SPACING.sm,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  domainDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  domainInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  domainNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  domainLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  badgeStrong: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.success,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  badgeWeak: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.warning,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  barBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  domainScoreCol: {
    alignItems: "flex-end",
    minWidth: 44,
  },
  domainScore: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
  },
  domainChange: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
});
