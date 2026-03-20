/**
 * DashboardScreen — Home tab.
 * Shows Balance Wheel (radar chart), score tier, domain breakdown with
 * progress bars + strongest/weakest badges, streak, and quick-action buttons.
 */
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation, useFocusEffect, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { auth, db } from "../../config/firebase";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Card, Button, EmptyState } from "../../shared/components";
import { DOMAINS, DOMAIN_IDS } from "../../config/domains";
import { getScoreTier } from "../../config/scoring";
import { DomainScores } from "../../features/scoring/types/scoring.types";
import { RootStackParamList, MainTabParamList } from "../../shared/types/navigation.types";
import { RadarChart } from "../../features/balance-wheel/components/RadarChart";

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

  const fetchScores = useCallback(async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.latestBalanceScore != null) setBalanceScore(data.latestBalanceScore);
      if (data.latestDomainScores) setDomainScores(data.latestDomainScores);
      if (data.streakData?.currentStreak) setStreak(data.streakData.currentStreak);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchScores();
    }, [fetchScores])
  );

  const hasScores = balanceScore != null && domainScores != null;

  // Find strongest & weakest domains
  let strongest: string | null = null;
  let weakest: string | null = null;
  if (domainScores) {
    const sorted = [...DOMAIN_IDS].sort(
      (a, b) => domainScores[b] - domainScores[a]
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
            title="Welcome to Balanced Life"
            message="Complete your first check-in to see your Balance Wheel — a visual map of how balanced your 5 life domains are."
          />
        ) : (
          <>
            {/* Balance Wheel (Radar Chart) */}
            <Card style={styles.chartCard}>
              <RadarChart scores={domainScores} size={280} />
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

            {/* Domain Breakdown */}
            <Text style={styles.sectionTitle}>Life Domains</Text>
            {DOMAIN_IDS.map((id) => {
              const domain = DOMAINS[id];
              const score = domainScores[id];
              const tier = getScoreTier(score);
              const isStrongest = id === strongest;
              const isWeakest = id === weakest;

              return (
                <Card key={id} style={styles.domainCard}>
                  <View style={styles.domainRow}>
                    <View
                      style={[styles.domainDot, { backgroundColor: domain.color }]}
                    />
                    <View style={styles.domainInfo}>
                      <View style={styles.domainNameRow}>
                        <Text style={styles.domainLabel}>{domain.label}</Text>
                        {isStrongest && (
                          <Text style={styles.badge}>Strongest</Text>
                        )}
                        {isWeakest && (
                          <Text style={[styles.badge, styles.badgeWeak]}>
                            Focus
                          </Text>
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
                    <Text
                      style={[styles.domainScore, { color: tier.color }]}
                    >
                      {score}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {streak > 0 && (
            <View style={styles.streakRow}>
              <Text style={styles.streakText}>
                🔥 {streak} day{streak !== 1 ? "s" : ""} streak
              </Text>
            </View>
          )}
          <Button
            title="Daily Check-In"
            onPress={() => navigation.navigate("CheckIn")}
            style={styles.actionButton}
          />
          <Button
            title="Weekly Missions"
            variant="outline"
            onPress={() => navigation.navigate("Missions")}
            style={styles.actionButton}
          />
        </View>

        {/* Sign out (testing) */}
        <Button
          title="Sign Out"
          onPress={() => signOut(auth)}
          variant="ghost"
          style={styles.signOutButton}
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
  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
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
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  domainCard: {
    marginBottom: SPACING.sm,
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
  badge: {
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
    color: COLORS.warning,
    backgroundColor: "#FEF3C7",
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
  domainScore: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },
  quickActions: {
    marginTop: SPACING.lg,
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
  actionButton: {
    marginBottom: SPACING.sm,
  },
  signOutButton: {
    marginTop: SPACING.md,
  },
});
