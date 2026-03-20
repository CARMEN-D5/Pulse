import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Button } from "../../../shared/components/Button";
import { ScoreCircle } from "../../../shared/components/ScoreCircle";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS, DOMAIN_IDS } from "../../../config/domains";
import { getScoreTier } from "../../../config/scoring";
import { BalanceScoreResult } from "../../scoring/types/scoring.types";
import { OnboardingStackParamList } from "../../../shared/types/navigation.types";
import { useAuthStore } from "../../auth/stores/authStore";

export function ScoreRevealScreen() {
  const route = useRoute<RouteProp<OnboardingStackParamList, "ScoreReveal">>();
  const { setHasCompletedAssessment } = useAuthStore();
  const { result } = route.params;
  const tier = getScoreTier(result.balanceScore);

  // Find strongest and weakest domains
  const sorted = [...DOMAIN_IDS].sort(
    (a, b) => result.domainScores[b] - result.domainScores[a]
  );
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Your Balance Score</Text>

      <ScoreCircle
        score={result.balanceScore}
        size={160}
        label={tier.label}
        style={styles.scoreCircle}
      />

      <Text style={styles.message}>{tier.message}</Text>

      {/* Domain Breakdown */}
      <Text style={styles.sectionTitle}>Domain Breakdown</Text>
      <Card style={styles.breakdownCard}>
        {DOMAIN_IDS.map((id) => {
          const domain = DOMAINS[id];
          const score = result.domainScores[id];
          const domainTier = getScoreTier(score);
          const barWidth = `${Math.max(score, 2)}%`;

          return (
            <View key={id} style={styles.domainRow}>
              <View style={styles.domainHeader}>
                <View style={styles.domainLabelRow}>
                  <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
                  <Text style={styles.domainName}>{domain.label}</Text>
                </View>
                <Text style={[styles.domainScore, { color: domainTier.color }]}>
                  {score}
                </Text>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[styles.barFill, { width: barWidth as any, backgroundColor: domain.color }]}
                />
              </View>
            </View>
          );
        })}
      </Card>

      {/* Highlights */}
      <View style={styles.highlights}>
        <Card style={{ ...styles.highlightCard, borderLeftColor: DOMAINS[strongest].color }}>
          <Text style={styles.highlightLabel}>Strongest Area</Text>
          <Text style={styles.highlightValue}>{DOMAINS[strongest].label}</Text>
          <Text style={styles.highlightScore}>{result.domainScores[strongest]}/100</Text>
        </Card>
        <Card style={{ ...styles.highlightCard, borderLeftColor: DOMAINS[weakest].color }}>
          <Text style={styles.highlightLabel}>Focus Area</Text>
          <Text style={styles.highlightValue}>{DOMAINS[weakest].label}</Text>
          <Text style={styles.highlightScore}>{result.domainScores[weakest]}/100</Text>
        </Card>
      </View>

      <Button
        title="Go to Dashboard"
        onPress={() => setHasCompletedAssessment(true)}
        style={styles.dashboardButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  scoreCircle: {
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  breakdownCard: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  domainRow: {
    gap: SPACING.xs,
  },
  domainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  domainLabelRow: {
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
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  domainScore: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "700",
  },
  barBg: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  highlights: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  highlightCard: {
    flex: 1,
    borderLeftWidth: 4,
  },
  highlightLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  highlightScore: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  dashboardButton: {
    marginTop: SPACING.md,
  },
});
