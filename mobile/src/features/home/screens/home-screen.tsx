import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { DOMAIN_LABELS } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import {
  deriveWeeklyMissions,
  loadMissionCompletionState,
  saveMissionCompletionState,
  type WeeklyMission
} from "@/features/missions/services/mission-service";
import {
  fetchLatestDashboardSnapshot,
  type DashboardSnapshot
} from "@/features/summary/services/summary-service";
import { formatWeekRange } from "@/lib/date-time";
import { toHelpfulErrorMessage } from "@/lib/errors";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";
import { createShadow, domainTheme, theme } from "@/theme/tokens";

export function HomeScreen() {
  const { user } = useAuthSession();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [missionCompletion, setMissionCompletion] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user?.id) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const nextSnapshot = await fetchLatestDashboardSnapshot(user.id);

        if (!isMounted) {
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(toHelpfulErrorMessage(error, "Unable to load the dashboard."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const weeklyMissions = deriveWeeklyMissions(snapshot);
  const missionWeekKey = snapshot?.lifeSummary?.weekStartLocalDate ?? "setup-week";

  useEffect(() => {
    let isMounted = true;

    async function loadMissionState() {
      if (!user?.id) {
        if (isMounted) {
          setMissionCompletion({});
        }
        return;
      }

      try {
        const nextState = await loadMissionCompletionState(user.id, missionWeekKey);

        if (isMounted) {
          setMissionCompletion(nextState);
        }
      } catch {
        if (isMounted) {
          setMissionCompletion({});
        }
      }
    }

    void loadMissionState();

    return () => {
      isMounted = false;
    };
  }, [missionWeekKey, user?.id]);

  const greetingName = profile?.displayName ?? "there";
  const strongestDomainKey = snapshot?.lifeSummary?.strongestDomainKey ?? null;
  const weakestDomainKey = snapshot?.lifeSummary?.weakestDomainKey ?? null;
  const currentStreakDays = profile?.currentStreakDays ?? 0;

  async function handleToggleMission(missionId: string) {
    if (!user?.id) {
      return;
    }

    const nextState = {
      ...missionCompletion,
      [missionId]: !missionCompletion[missionId]
    };

    setMissionCompletion(nextState);
    await saveMissionCompletionState(user.id, missionWeekKey, nextState);
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>VELORA</Text>
        <Text style={styles.title}>Good to see you, {greetingName}.</Text>
        <Text style={styles.copy}>
          See where your balance is strongest, where it needs care, and what to do next today.
        </Text>
      </View>

      <Card style={styles.scoreCard} variant="highlight">
        <Text style={styles.scoreLabel}>Balanced life score</Text>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : snapshot?.lifeSummary ? (
          <View style={styles.scoreContent}>
            <View style={styles.scoreRing}>
              <Text style={styles.scoreValue}>
                {Math.round(snapshot.lifeSummary.balancedLifeScore)}
              </Text>
              <Text style={styles.scoreRingLabel}>balance</Text>
            </View>
            <View style={styles.scoreBody}>
              <Text style={styles.scoreHeadline}>
                {snapshot.lifeSummary.isProvisional
                  ? "This week is still building."
                  : "A steady week to build from."}
              </Text>
              <Text style={styles.scoreMeta}>
                {formatWeekRange(snapshot.lifeSummary.weekStartLocalDate)}
              </Text>
              <Text style={styles.scoreSubMeta}>
                Life strength {snapshot.lifeSummary.lifeStrength.toFixed(1)} • Evenness{" "}
                {snapshot.lifeSummary.evenness.toFixed(1)}
              </Text>
            </View>
          </View>
        ) : (
          <StatusCard
            message="Keep using check-ins and action logs so your first official week can be finalized."
            title="No official summary yet"
            tone="neutral"
          />
        )}
      </Card>

      <View style={styles.quickGrid}>
        <Card style={styles.quickCard}>
          <Text style={styles.quickTitle}>Strongest domain</Text>
          {strongestDomainKey ? (
            <View style={styles.quickValueRow}>
              <View
                style={[
                  styles.quickDot,
                  { backgroundColor: domainTheme[strongestDomainKey].accent }
                ]}
              />
              <Text style={styles.quickValue}>{DOMAIN_LABELS[strongestDomainKey]}</Text>
            </View>
          ) : (
            <Text style={styles.quickValue}>Not available yet</Text>
          )}
        </Card>
        <Card style={styles.quickCard}>
          <Text style={styles.quickTitle}>Needs attention</Text>
          {weakestDomainKey ? (
            <View style={styles.quickValueRow}>
              <View
                style={[
                  styles.quickDot,
                  { backgroundColor: domainTheme[weakestDomainKey].accent }
                ]}
              />
              <Text style={styles.quickValue}>{DOMAIN_LABELS[weakestDomainKey]}</Text>
            </View>
          ) : (
            <Text style={styles.quickValue}>Not available yet</Text>
          )}
        </Card>
      </View>

      <Card variant="highlight">
        <View style={styles.missionHeader}>
          <View style={styles.missionHeadingWrap}>
            <Text style={styles.sectionTitle}>This week&apos;s missions</Text>
            <Text style={styles.itemCopy}>
              Lightweight prompts shaped by your official weekly balance snapshot.
            </Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakPillCount}>{currentStreakDays}</Text>
            <Text style={styles.streakPillLabel}>day streak</Text>
          </View>
        </View>

        {weeklyMissions.map((mission) => {
          const isComplete = Boolean(missionCompletion[mission.id]);

          return (
            <View key={mission.id} style={styles.missionCard}>
              <View style={styles.missionIconWrap}>
                <MaterialCommunityIcons
                  color={mission.domainKey ? domainTheme[mission.domainKey].accent : theme.colors.primary}
                  name={mission.iconName as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={24}
                />
              </View>

              <View style={styles.missionBody}>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionCopy}>{mission.body}</Text>
                <View style={styles.missionActions}>
                  <Button onPress={() => router.push(mission.route as never)} tone="secondary">
                    {mission.actionLabel}
                  </Button>
                  <Button
                    onPress={() => void handleToggleMission(mission.id)}
                    tone={isComplete ? "ghost" : "primary"}
                  >
                    {isComplete ? mission.completionLabel : "Mark complete"}
                  </Button>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Latest domain scores</Text>
        {isLoading ? <Text style={styles.itemCopy}>Loading domain summaries...</Text> : null}
        {!isLoading && snapshot?.domainSummaries.length
          ? snapshot.domainSummaries.map((summary) => (
              <View key={summary.domainKey} style={styles.metricRow}>
                <View style={styles.metricHeader}>
                  <Text style={styles.itemLabel}>{DOMAIN_LABELS[summary.domainKey]}</Text>
                  <Text style={styles.itemValue}>{summary.displayedScore.toFixed(0)}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: domainTheme[summary.domainKey].accent,
                        width: `${Math.max(8, Math.min(100, summary.displayedScore))}%`
                      }
                    ]}
                  />
                </View>
              </View>
            ))
          : null}
        {!isLoading && !snapshot?.domainSummaries.length ? (
          <Text style={styles.itemCopy}>
            There is no official weekly domain summary yet. Keep using check-ins and action logs so
            the backend can finalize your first week.
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Button onPress={() => router.push("/(app)/(tabs)/check-in")}>Open today&apos;s check-in</Button>
        <Button onPress={() => router.push("/(app)/(tabs)/actions")} tone="secondary">
          Log an action
        </Button>
        <Button onPress={() => router.push("/(app)/(tabs)/summary")} tone="ghost">
          Review weekly history
        </Button>
      </Card>

      {errorMessage ? (
        <StatusCard message={errorMessage} title="Dashboard unavailable" tone="error" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 4
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24
  },
  scoreCard: {
    marginBottom: 4
  },
  scoreLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  scoreContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20
  },
  scoreRing: {
    ...createShadow("sm"),
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: 999,
    borderWidth: 6,
    height: 132,
    justifyContent: "center",
    width: 132
  },
  scoreValue: {
    color: theme.colors.primary,
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48
  },
  scoreRingLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  scoreBody: {
    flex: 1,
    gap: 8
  },
  scoreHeadline: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24
  },
  scoreMeta: {
    color: theme.colors.textSoft,
    fontSize: 14
  },
  scoreSubMeta: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12
  },
  quickCard: {
    flex: 1
  },
  missionActions: {
    flexDirection: "row",
    gap: 10
  },
  missionBody: {
    flex: 1,
    gap: 10
  },
  missionCard: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: theme.spacing.lg
  },
  missionCopy: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  missionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between"
  },
  missionHeadingWrap: {
    flex: 1,
    gap: 4
  },
  missionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  missionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22
  },
  quickTitle: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  quickValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  quickDot: {
    borderRadius: 999,
    height: 10,
    width: 10
  },
  quickValue: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  streakPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  streakPillCount: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28
  },
  streakPillLabel: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricRow: {
    gap: 8
  },
  metricHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  itemLabel: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  itemValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  progressTrack: {
    backgroundColor: "rgba(8, 106, 105, 0.08)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    borderRadius: 999,
    height: "100%"
  },
  itemCopy: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  }
});
