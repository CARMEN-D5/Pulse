import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../shared/types/navigation.types";
import { Button } from "../../../shared/components/Button";
import { ScoreCircle } from "../../../shared/components/ScoreCircle";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { DOMAINS, DOMAIN_IDS } from "../../../config/domains";
import { getScoreTier } from "../../../config/scoring";
import { CheckInResult } from "../services/checkInService";
import { BadgeUnlockBanner } from "../../badges/components/BadgeUnlockBanner";

type CheckInResultParams = {
  CheckInResult: { result: CheckInResult };
};

export function CheckInResultScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<CheckInResultParams, "CheckInResult">>();
  const { result } = route.params;

  const scoreDiff = result.balanceScore - result.previousBalanceScore;
  const tier = getScoreTier(result.balanceScore);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Streak */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>
            {result.streakCount} day{result.streakCount !== 1 ? "s" : ""} streak
          </Text>
        </View>

        <Text style={styles.title}>Check-In Complete!</Text>

        {/* Newly unlocked badges */}
        {result.newBadges && result.newBadges.length > 0 && (
          <BadgeUnlockBanner badges={result.newBadges} />
        )}

        {/* Score */}
        <ScoreCircle score={result.balanceScore} size={140} style={styles.scoreCircle} />

        <View style={styles.scoreChange}>
          <Text style={[styles.scoreDiff, { color: scoreDiff >= 0 ? COLORS.success : COLORS.error }]}>
            {scoreDiff >= 0 ? "+" : ""}{scoreDiff}
          </Text>
          <Text style={styles.scoreChangeLabel}>
            {scoreDiff > 0 ? "points up" : scoreDiff < 0 ? "points down" : "no change"} from last time
          </Text>
        </View>

        <Text style={[styles.tierMessage, { color: tier.color }]}>{tier.message}</Text>

        {/* Domain breakdown with per-domain changes */}
        <Card style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Domain Scores</Text>
          {DOMAIN_IDS.map((id) => {
            const domain = DOMAINS[id];
            const score = result.domainScores[id];
            const prevScore = result.previousDomainScores[id] ?? score;
            const domainDiff = Math.round((score - prevScore) * 10) / 10;
            const domainTier = getScoreTier(score);

            return (
              <View key={id} style={styles.domainRow}>
                <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
                <Text style={styles.domainName}>{domain.label}</Text>
                {domainDiff !== 0 && (
                  <Text style={[styles.domainChange, { color: domainDiff > 0 ? COLORS.success : COLORS.error }]}>
                    {domainDiff > 0 ? "+" : ""}{domainDiff}
                  </Text>
                )}
                <Text style={[styles.domainScore, { color: domainTier.color }]}>{score}</Text>
              </View>
            );
          })}
        </Card>

        <Button
          title="Back to Dashboard"
          onPress={() => navigation.navigate("Main")}
          style={styles.button}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  streakBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#EA580C",
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    marginBottom: SPACING.md,
  },
  scoreChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  scoreDiff: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
  },
  scoreChangeLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  tierMessage: {
    fontSize: FONT_SIZES.body,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  breakdownCard: {
    width: "100%",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  breakdownTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  domainRow: {
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
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  domainChange: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  domainScore: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "right",
  },
  button: {
    width: "100%",
  },
});
