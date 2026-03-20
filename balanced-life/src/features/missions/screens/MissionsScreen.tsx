/**
 * MissionsScreen — Shows this week's personalised micro actions.
 *
 * Missions are generated based on the user's weakest domains.
 * User can complete or skip each mission.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS } from "../../../config/domains";
import { useAuthStore } from "../../auth/stores/authStore";
import { EmptyState } from "../../../shared/components/EmptyState";
import { MissionCard } from "../components/MissionCard";
import { WeeklyMissionSet } from "../types/mission.types";
import {
  getOrCreateWeeklyMissions,
  updateMissionStatus,
} from "../services/missionService";

export function MissionsScreen() {
  const { user } = useAuthStore();
  const [missionSet, setMissionSet] = useState<WeeklyMissionSet | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMissions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getOrCreateWeeklyMissions(user.uid);
      setMissionSet(data);
    } catch (error) {
      console.error("Failed to load missions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMissions();
    }, [loadMissions])
  );

  async function handleComplete(missionId: string) {
    if (!user || !missionSet) return;
    try {
      const updated = await updateMissionStatus(
        user.uid,
        missionSet.weekId,
        missionId,
        "completed"
      );
      setMissionSet(updated);
    } catch (error) {
      Alert.alert("Error", "Failed to update mission.");
    }
  }

  async function handleSkip(missionId: string) {
    if (!user || !missionSet) return;
    try {
      const updated = await updateMissionStatus(
        user.uid,
        missionSet.weekId,
        missionId,
        "skipped"
      );
      setMissionSet(updated);
    } catch (error) {
      Alert.alert("Error", "Failed to update mission.");
    }
  }

  const completedCount = missionSet?.completedCount ?? 0;
  const totalCount = missionSet?.totalCount ?? 0;
  const allDone = completedCount === totalCount && totalCount > 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Weekly Missions</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Generating your missions...</Text>
          </View>
        ) : missionSet ? (
          <>
            {/* Progress header */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>This Week's Focus</Text>
                <Text style={styles.progressCount}>
                  {completedCount}/{totalCount} done
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: allDone ? COLORS.success : COLORS.primary,
                    },
                  ]}
                />
              </View>

              {/* Target domains */}
              <View style={styles.targetDomains}>
                <Text style={styles.targetLabel}>Targeting: </Text>
                {missionSet.targetDomains.map((id) => (
                  <View
                    key={id}
                    style={[
                      styles.targetBadge,
                      { backgroundColor: DOMAINS[id].lightColor },
                    ]}
                  >
                    <Text style={[styles.targetBadgeText, { color: DOMAINS[id].color }]}>
                      {DOMAINS[id].label}
                    </Text>
                  </View>
                ))}
              </View>

              {allDone && (
                <View style={styles.allDoneBanner}>
                  <Text style={styles.allDoneText}>
                    🎉 All missions completed this week!
                  </Text>
                </View>
              )}
            </View>

            {/* Mission cards */}
            {missionSet.missions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={() => handleComplete(mission.id)}
                onSkip={() => handleSkip(mission.id)}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon="🎯"
            title="No Missions Yet"
            message="Complete a daily check-in first — missions are personalised based on your weakest life domains."
          />
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
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  progressCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  progressTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  progressCount: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  targetDomains: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  targetLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  targetBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  targetBadgeText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  allDoneBanner: {
    backgroundColor: "#F0FDF4",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: "center",
  },
  allDoneText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.success,
  },
  errorText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.error,
    textAlign: "center",
    marginTop: SPACING.xxl,
  },
});
