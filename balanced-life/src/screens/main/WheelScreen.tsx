/**
 * WheelScreen — Radar chart (Balance Wheel) showing all 5 domain scores.
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";

import { db } from "../../config/firebase";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Card, ScoreCircle, EmptyState } from "../../shared/components";
import { DOMAINS, DOMAIN_IDS } from "../../config/domains";
import { getScoreTier } from "../../config/scoring";
import { DomainScores } from "../../features/scoring/types/scoring.types";
import { RadarChart } from "../../features/balance-wheel/components/RadarChart";

export function WheelScreen() {
  const { user } = useAuthStore();
  const [balanceScore, setBalanceScore] = useState<number | null>(null);
  const [domainScores, setDomainScores] = useState<DomainScores | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.latestBalanceScore != null) setBalanceScore(data.latestBalanceScore);
        if (data.latestDomainScores) setDomainScores(data.latestDomainScores);
      }
    })();
  }, [user]);

  const hasScores = balanceScore != null && domainScores != null;

  // Find strongest and weakest
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
        <Text style={styles.title}>Balance Wheel</Text>

        {!hasScores ? (
          <EmptyState
            title="Complete Your Assessment"
            message="Take the initial assessment to see your Balance Wheel — a visual map of how balanced your 5 life domains are."
          />
        ) : (
          <>
            {/* Radar Chart */}
            <Card style={styles.chartCard}>
              <RadarChart scores={domainScores} size={320} />
            </Card>

            {/* Overall Score */}
            <Card style={styles.overallCard}>
              <ScoreCircle score={balanceScore} size={80} />
              <View style={styles.overallInfo}>
                <Text style={styles.overallLabel}>Overall Balance</Text>
                <Text style={[styles.overallTier, { color: getScoreTier(balanceScore).color }]}>
                  {getScoreTier(balanceScore).label}
                </Text>
                <Text style={styles.overallMessage}>
                  {getScoreTier(balanceScore).message}
                </Text>
              </View>
            </Card>

            {/* Domain List */}
            <Text style={styles.sectionTitle}>Domain Scores</Text>
            {DOMAIN_IDS.map((id) => {
              const domain = DOMAINS[id];
              const score = domainScores[id];
              const tier = getScoreTier(score);
              const isStrongest = id === strongest;
              const isWeakest = id === weakest;

              return (
                <Card key={id} style={styles.domainCard}>
                  <View style={styles.domainRow}>
                    <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
                    <View style={styles.domainInfo}>
                      <View style={styles.domainNameRow}>
                        <Text style={styles.domainName}>{domain.label}</Text>
                        {isStrongest && <Text style={styles.badge}>Strongest</Text>}
                        {isWeakest && <Text style={[styles.badge, styles.badgeWeak]}>Focus</Text>}
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
                    <Text style={[styles.domainScore, { color: tier.color }]}>{score}</Text>
                  </View>
                </Card>
              );
            })}
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
    marginBottom: SPACING.md,
  },
  chartCard: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
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
    fontWeight: "600",
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
  domainName: {
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
});
