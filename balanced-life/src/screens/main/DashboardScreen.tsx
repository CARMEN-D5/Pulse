/**
 * DashboardScreen — Home tab. Shows Balance Score, domain summary, and quick actions.
 */
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../config/firebase";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Card, Button, ScoreCircle } from "../../shared/components";
import { DOMAINS, DOMAIN_IDS, DomainId } from "../../config/domains";
import { getScoreTier } from "../../config/scoring";
import { DomainScores } from "../../features/scoring/types/scoring.types";

export function DashboardScreen() {
  const { user } = useAuthStore();
  const displayName = user?.displayName || "there";

  const [balanceScore, setBalanceScore] = useState<number | null>(null);
  const [domainScores, setDomainScores] = useState<DomainScores | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.latestBalanceScore != null) {
          setBalanceScore(data.latestBalanceScore);
        }
        if (data.latestDomainScores) {
          setDomainScores(data.latestDomainScores);
        }
      }
    })();
  }, [user]);

  const hasScores = balanceScore != null && domainScores != null;

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

        {/* Balance Score */}
        <Card style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Your Balance Score</Text>
          <ScoreCircle score={hasScores ? balanceScore : 0} size={120} />
          {hasScores ? (
            <Text style={[styles.scoreHint, { color: getScoreTier(balanceScore).color }]}>
              {getScoreTier(balanceScore).label}
            </Text>
          ) : (
            <Text style={styles.scoreHint}>
              Complete your first check-in to see your score
            </Text>
          )}
        </Card>

        {/* Domain Summary */}
        <Text style={styles.sectionTitle}>Life Domains</Text>
        {DOMAIN_IDS.map((id) => {
          const domain = DOMAINS[id];
          const score = domainScores ? domainScores[id] : null;
          return (
            <Card key={id} style={styles.domainCard}>
              <View style={styles.domainRow}>
                <View
                  style={[styles.domainDot, { backgroundColor: domain.color }]}
                />
                <View style={styles.domainInfo}>
                  <Text style={styles.domainLabel}>{domain.label}</Text>
                  <Text style={styles.domainDesc}>{domain.description}</Text>
                </View>
                <Text style={[styles.domainScore, { color: score != null ? domain.color : COLORS.textMuted }]}>
                  {score != null ? score : "--"}
                </Text>
              </View>
            </Card>
          );
        })}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            title="Daily Check-In"
            onPress={() => {
              // TODO: Navigate to check-in modal
            }}
            style={styles.checkInButton}
          />
        </View>

        {/* Temporary sign out button for testing */}
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
  scoreCard: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  scoreLabel: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  scoreHint: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    fontWeight: "500",
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
  },
  domainDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  domainInfo: {
    flex: 1,
  },
  domainLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  domainDesc: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  domainScore: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    marginLeft: SPACING.sm,
  },
  quickActions: {
    marginTop: SPACING.lg,
  },
  checkInButton: {
    marginBottom: SPACING.sm,
  },
  signOutButton: {
    marginTop: SPACING.md,
  },
});
