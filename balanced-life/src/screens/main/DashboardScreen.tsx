/**
 * DashboardScreen — Home tab.
 * Shows Balance Wheel (radar chart with tappable domains), score tier,
 * engagement card, and streak. Tapping a domain navigates to Progress.
 */
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// signOut moved to ProfileScreen
import { doc, getDoc } from "firebase/firestore";
import { useNavigation, useFocusEffect, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { db } from "../../config/firebase";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Card, EmptyState } from "../../shared/components";
import { DomainId } from "../../config/domains";
import { getScoreTier } from "../../config/scoring";
import { DomainScores, WeeklyEngagement } from "../../features/scoring/types/scoring.types";
import { RootStackParamList, MainTabParamList } from "../../shared/types/navigation.types";
import { RadarChart } from "../../features/balance-wheel/components/RadarChart";
import { EngagementCard } from "../../features/scoring/components/EngagementCard";
import { fetchWeeklyEngagement } from "../../features/scoring/services/engagementService";
import { useNotifications } from "../../features/notifications/hooks/useNotifications";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Dashboard">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const displayName = user?.displayName || "there";

  const [balanceScore, setBalanceScore] = useState<number | null>(null);
  const [domainScores, setDomainScores] = useState<DomainScores | null>(null);
  const [streak, setStreak] = useState(0);
  const [engagement, setEngagement] = useState<WeeklyEngagement | null>(null);

  // Initialise push notifications on first render
  useNotifications(user?.uid);

  const fetchScores = useCallback(async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.latestBalanceScore != null) setBalanceScore(data.latestBalanceScore);
      if (data.latestDomainScores) setDomainScores(data.latestDomainScores);
      if (data.streakData?.currentStreak) setStreak(data.streakData.currentStreak);
    }
    try {
      const engScore = await fetchWeeklyEngagement(user.uid);
      setEngagement(engScore);
    } catch (e) {
      console.warn("Failed to fetch engagement score:", e);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchScores();
    }, [fetchScores])
  );

  const hasScores = balanceScore != null && domainScores != null;

  const handleDomainPress = (domainId: DomainId) => {
    navigation.navigate("Progress", { domainId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Hey {displayName}! 👋</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>

        {!hasScores ? (
          <EmptyState
            icon="⚖️"
            title="Welcome to Balanced Life"
            message="Complete your first check-in to see your Balance Wheel — a visual map of how balanced your 5 life domains are."
            actionLabel="Start Check-In"
            onAction={() => navigation.navigate("CheckIn")}
          />
        ) : (
          <>
            {/* Balance Wheel (Radar Chart) — tap domain to see progress */}
            <Card style={styles.chartCard}>
              <RadarChart
                scores={domainScores}
                size={280}
                onDomainPress={handleDomainPress}
              />
              <Text style={styles.chartHint}>Tap a domain to see its progress</Text>
            </Card>

            {/* Overall Score + Tier */}
            <Card style={styles.overallCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{balanceScore}</Text>
              </View>
              <View style={styles.overallInfo}>
                <Text style={styles.overallLabel}>Balance Score</Text>
                <Text
                  style={[
                    styles.overallTier,
                    { color: getScoreTier(balanceScore).color },
                  ]}
                >
                  {getScoreTier(balanceScore).label}
                </Text>
                <Text style={styles.overallMessage}>
                  {getScoreTier(balanceScore).message}
                </Text>
              </View>
            </Card>

            {/* Streak */}
            {streak > 0 && (
              <View style={styles.streakRow}>
                <Text style={styles.streakText}>
                  🔥 {streak} day{streak !== 1 ? "s" : ""} streak
                </Text>
              </View>
            )}

            {/* Engagement Score */}
            {engagement && <EngagementCard engagement={engagement} />}
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
  greeting: {
    marginBottom: SPACING.lg,
  },
  greetingText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  chartCard: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  chartHint: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  overallInfo: {
    flex: 1,
  },
  overallLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  overallTier: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
  },
  overallMessage: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  streakRow: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  streakText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    color: "#EA580C",
  },
});
