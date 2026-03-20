/**
 * WeeklyReviewScreen — End-of-week summary showing engagement tier,
 * mission recap, domain trends, mood summary, and motivational insight.
 */
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { RootStackParamList } from "../../../shared/types/navigation.types";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { useAuthStore } from "../../auth/stores/authStore";
import { WeeklyReviewData } from "../types/weeklyReview.types";
import { fetchWeeklyReviewData } from "../services/weeklyReviewService";
import { WeekSummaryCard } from "../components/WeekSummaryCard";
import { MissionRecap } from "../components/MissionRecap";
import { DomainTrendCard } from "../components/DomainTrendCard";
import { MoodRecap } from "../components/MoodRecap";

export function WeeklyReviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const [reviewData, setReviewData] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReview = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchWeeklyReviewData(user.uid);
      setReviewData(data);
    } catch (error) {
      console.error("Failed to fetch weekly review:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadReview();
    }, [loadReview])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your week...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reviewData) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="📋"
          title="No Review Available"
          message="No activity this week yet. Start with a daily check-in and come back to see your weekly summary!"
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{reviewData.weekLabel}</Text>
        </View>

        <Text style={styles.title}>Weekly Review</Text>
        <Text style={styles.subtitle}>Here's how your week went</Text>

        {/* Week Summary */}
        <WeekSummaryCard
          summary={reviewData.summary}
          tier={reviewData.engagement.tier}
          engagementScore={reviewData.engagement.overall}
        />

        {/* Insight banner */}
        {reviewData.insight.length > 0 && (
          <Card style={styles.insightCard}>
            <Text style={styles.insightEmoji}>💡</Text>
            <Text style={styles.insightText}>{reviewData.insight}</Text>
          </Card>
        )}

        {/* Domain Trends */}
        <DomainTrendCard
          snapshots={reviewData.dailySnapshots}
          summary={reviewData.summary}
        />

        {/* Mission Recap */}
        <MissionRecap
          completed={reviewData.missions.completed}
          skipped={reviewData.missions.skipped}
          pending={reviewData.missions.pending}
          totalCount={reviewData.missions.totalCount}
          completedCount={reviewData.missions.completedCount}
        />

        {/* Mood Recap */}
        <MoodRecap moods={reviewData.moods} />

        {/* CTA */}
        <Button
          title="Back to Dashboard"
          onPress={() => navigation.navigate("Main")}
          style={styles.ctaButton}
        />
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
    gap: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  backButton: {
    paddingVertical: SPACING.xs,
  },
  backText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
  weekLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  insightEmoji: {
    fontSize: 20,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  ctaButton: {
    marginTop: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
});
