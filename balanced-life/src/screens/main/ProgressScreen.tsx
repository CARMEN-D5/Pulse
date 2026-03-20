/**
 * ProgressScreen — Score trend charts over 7/30/90 days.
 * Shows Balance Score line chart, domain-specific charts, and period stats.
 */
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { DOMAINS, DomainId, DOMAIN_IDS } from "../../config/domains";
import { EmptyState } from "../../shared/components";
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

export function ProgressScreen() {
  const { user } = useAuthStore();
  const [range, setRange] = useState<TimeRange>("7d");
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [moodData, setMoodData] = useState<MoodDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Map time range to number of days for mood history
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

  // Reload when screen is focused or range changes
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const hasData = snapshots.length > 0;

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
              /* Balance Score chart */
              <TrendLineChart
                title="Balance Score"
                data={toBalanceScoreData(snapshots, range)}
                color={COLORS.primary}
                showArea
              />
            ) : (
              /* Single domain chart */
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

            {/* All domains overview (when Balance Score is selected) */}
            {selectedDomain === null && (
              <View style={styles.domainOverview}>
                <Text style={styles.sectionTitle}>Domain Trends</Text>
                {DOMAIN_IDS.map((id) => {
                  const domain = DOMAINS[id];
                  const data = toDomainData(snapshots, id, range);
                  const latest = data.length > 0 ? data[data.length - 1].value : 0;
                  const first = data.length > 0 ? data[0].value : 0;
                  const change = latest - first;

                  return (
                    <View key={id} style={styles.domainMiniRow}>
                      <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
                      <Text style={styles.domainName}>{domain.label}</Text>
                      <Text style={[styles.domainScore, { color: domain.color }]}>
                        {latest}
                      </Text>
                      {change !== 0 && (
                        <Text
                          style={[
                            styles.domainChange,
                            { color: change > 0 ? COLORS.success : COLORS.error },
                          ]}
                        >
                          {change > 0 ? "+" : ""}{Math.round(change * 10) / 10}
                        </Text>
                      )}
                    </View>
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
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  domainOverview: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  domainMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  domainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  domainName: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  domainScore: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "right",
  },
  domainChange: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    minWidth: 35,
    textAlign: "right",
  },
  moodSection: {
    marginBottom: SPACING.md,
  },
});
