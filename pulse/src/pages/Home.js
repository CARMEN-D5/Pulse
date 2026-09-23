import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import Icon from "../components/Icon";
import { Screen } from "../components/ui";
import { computeCurrentScores } from "../firestore/scoring";
import { DOMAINS, DOMAIN_KEYS } from "../scoring/scoringEngine";
import { colors, domains as DOMAIN_META, fonts, radius, shadow, spacing, type } from "../theme";
import DailyMissions from "./DailyMissions";
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from "../tutorial";

/* Domain visual config now lives in theme.js (`domains`), aliased here as
   DOMAIN_META so the rest of this file didn't need to change shape. */

const GRID_ORDER = ["spirituality", "health", "relationships", "finance", "productivity"];

const RADAR_ORDER = ["spirituality", "relationships", "finance", "health", "productivity"];
const RADAR_LABELS = {
  spirituality:  "Spirit",
  relationships: "Family",
  finance:       "Finance",
  health:        "Health",
  productivity:  "Work",
};

/* One short line of encouragement above the missions card. The index is
   derived from the date so the banner is stable for a whole day and rotates
   on its own the next morning. */
const DAILY_QUOTES = [
  "Three small wins beat one perfect day.",
  "Progress counts even when it is quiet.",
  "Balance is built, not found.",
  "Do the small thing you keep postponing.",
  "Rest is part of the work.",
  "One honest check-in changes the day.",
  "Consistency outlasts motivation.",
];

function quoteOfTheDay(date = new Date()) {
  const dayNumber = Math.floor(date.getTime() / 86400000);
  return DAILY_QUOTES[dayNumber % DAILY_QUOTES.length];
}

const FOCUS_SUGGESTIONS = {
  spirituality:  { title: "Focus on Mindfulness",  text: "Boost mental clarity with a 10-minute meditation session.", icon: "self_improvement" },
  relationships: { title: "Strengthen Connections", text: "Reach out to someone you care about today.",               icon: "diversity_1" },
  productivity:  { title: "Boost Productivity",     text: "Complete one important task to build momentum.",           icon: "target" },
  health:        { title: "Prioritize Health",      text: "Take a short walk or stretch session to energize.",        icon: "directions_walk" },
  finance:       { title: "Review Finances",        text: "Log your expenses and review your budget today.",          icon: "account_balance" },
};

function getStatusLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Needs Focus";
}

function getScoreLabel(score) {
  if (score >= 85) return "Thriving";
  if (score >= 70) return "Good";
  if (score >= 50) return "Building";
  return "Focus";
}

function getStatusColor(score) {
  if (score >= 80) return "#3A8F70";
  if (score >= 60) return "#2A7A6A";
  if (score >= 40) return "#C48030";
  return "#B33D54";
}

/* ── Radar geometry ────────────────────────────────────────── */
const CX = 78, CY = 73, MAX_R = 55;

function radarPt(i, pct) {
  const a = (2 * Math.PI * i) / 5 - Math.PI / 2;
  const r = (MAX_R * pct) / 100;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function labelPt(i) {
  const a = (2 * Math.PI * i) / 5 - Math.PI / 2;
  const r = MAX_R + 12;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

/* ── Radar Chart ───────────────────────────────────────────── */
function RadarChart({ domainScores }) {
  const pts = RADAR_ORDER.map((k, i) => radarPt(i, domainScores[k] ?? 0));
  const poly = pts.map((p) => p.join(",")).join(" ");
  const gridRings = [25, 50, 75, 100];

  return (
    <Svg width="100%" height={300} viewBox="0 0 156 146">
      <Defs>
        <RadialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#E0546E" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#B33D54" stopOpacity="0.06" />
        </RadialGradient>
      </Defs>

      {/* Grid rings */}
      {gridRings.map((pct) => (
        <Polygon
          key={pct}
          points={RADAR_ORDER.map((_, i) => radarPt(i, pct).join(",")).join(" ")}
          fill="none"
          stroke="#E6DCD6"
          strokeWidth="0.35"
        />
      ))}

      {/* Axis lines */}
      {RADAR_ORDER.map((_, i) => {
        const [x, y] = radarPt(i, 100);
        return <Line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#E6DCD6" strokeWidth="0.35" />;
      })}

      {/* Data polygon */}
      <Polygon
        points={poly}
        fill="url(#radarFill)"
        stroke="#B33D54"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {pts.map(([x, y], i) => (
        <G key={i}>
          <Circle cx={x} cy={y} r="2.5" fill="#fff" stroke="#B33D54" strokeWidth="0.9" />
          <Circle cx={x} cy={y} r="1.15" fill="#B33D54" />
        </G>
      ))}

      {/* Labels + scores */}
      {RADAR_ORDER.map((key, i) => {
        const [x, y] = labelPt(i);
        const anchor = x < 50 ? "end" : x > 70 ? "start" : "middle";
        const score = Math.round(domainScores[key] ?? 0);
        return (
          <G key={key}>
            <SvgText
              x={x}
              y={y - 1.5}
              textAnchor={anchor}
              fill="#2A2523"
              fontSize="4.3"
              fontFamily={fonts.bold}
            >
              {RADAR_LABELS[key]}
            </SvgText>
            <SvgText
              x={x}
              y={y + 3.6}
              textAnchor={anchor}
              fill="#7D756F"
              fontSize="3.6"
              fontFamily={fonts.semibold}
            >
              {`${score}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

/* ── Mini progress bar ─────────────────────────────────────── */
function MiniBar({ value, color }) {
  return (
    <View style={styles.minibar}>
      <View style={[styles.minibarFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ── Details / Diagram switch on the overview card ─────────── */
function OverviewTab({ id, label, icon, active, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(id)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.overviewTab, active && styles.overviewTabActive, pressed && styles.pressed]}
    >
      <Icon name={icon} size={18} color={active ? colors.pulsePrimaryDark : colors.textMuted} />
      <Text style={[styles.overviewTabText, active && styles.overviewTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ── Home / Dashboard ──────────────────────────────────────── */
function Home({
  user, userDoc, scoreVersion,
  onDomainSelect, onOpenDomain, onNevigate,
}) {
  const [scores, setScores] = useState(null);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [overviewTab, setOverviewTab] = useState("diagram");

  useTutorial("appOverview", { enabled: Boolean(user?.uid && scores) });

  const openDomain = onDomainSelect || onOpenDomain || onNevigate || (() => {});

  useEffect(() => {
    if (!user?.uid || !userDoc) return;
    let cancelled = false;
    setScoresLoading(true);
    computeCurrentScores(user.uid, userDoc)
      .then((result) => {
        if (!cancelled) setScores(result);
      })
      .finally(() => {
        if (!cancelled) setScoresLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, userDoc, scoreVersion]);

  const balanceScore = scores ? Math.round(scores.balancedLifeScore) : 0;

  const focusDomainKey = scores
    ? DOMAIN_KEYS.reduce((low, key) =>
        scores.domainScores[key] < scores.domainScores[low] ? key : low
      )
    : "spirituality";
  const focusSuggestion = FOCUS_SUGGESTIONS[focusDomainKey];
  const focusMeta = DOMAIN_META[focusDomainKey];

  return (
    <Screen
      contentContainerStyle={styles.screen}
      keyboardAvoiding={false}
      gradient={false}
      safeArea={false}
    >
      <View style={styles.main}>
        {/* ── Quote of the day ─────────────────────── */}
        <View style={styles.quote}>
          <View style={styles.quoteAccent} />
          <View style={styles.quoteBody}>
            <Text style={styles.quoteText}>{quoteOfTheDay()}</Text>
          </View>
        </View>

        {scoresLoading ? (
          <View style={styles.hero}>
            <View style={styles.skeletonRing} />
            <Text style={styles.loadingText}>Calculating your balance…</Text>
          </View>
        ) : scores ? (
          <>
            {/* ── Daily missions ─────────────────────── */}
            <TutorialTarget id={TUTORIAL_TARGETS.home.dailyMissions}>
              <DailyMissions user={user} domainScores={scores.domainScores} historyPlacement="hidden" compact />
            </TutorialTarget>

            {/* ── Overview: per-domain detail or radar ─ */}
            <TutorialTarget id={TUTORIAL_TARGETS.home.domainCard}>
            <View style={[styles.card, shadow("md")]}>
              <View style={styles.overviewTabs} accessibilityRole="tablist">
                <OverviewTab
                  id="details"
                  label="Details"
                  icon="format_list_bulleted"
                  active={overviewTab === "details"}
                  onPress={setOverviewTab}
                />
                <OverviewTab
                  id="diagram"
                  label="Diagram"
                  icon="donut_small"
                  active={overviewTab === "diagram"}
                  onPress={setOverviewTab}
                />
              </View>

              {overviewTab === "details" ? (
                <View style={styles.domainList}>
                  {GRID_ORDER.map((key) => {
                    const score = Math.round(scores.domainScores[key] ?? 0);
                    const meta = DOMAIN_META[key];
                    return (
                      <View
                        key={key}
                        accessibilityLabel={`${DOMAINS[key].label}, score ${score}`}
                        style={styles.domainRow}
                      >
                        <LinearGradient
                          colors={meta.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.domainIconTile}
                        >
                          <Icon name={meta.icon} size={16} color="#fff" />
                        </LinearGradient>

                        <View style={styles.domainDetail}>
                          <View style={styles.domainTopRow}>
                            <Text style={styles.domainName}>{DOMAINS[key].label}</Text>
                            <View style={styles.domainScoreGroup}>
                              <Text style={[styles.domainBadge, { color: meta.text }]}>
                                {getScoreLabel(score)}
                              </Text>
                              <Text style={[styles.domainScore, { color: meta.text }]}>{score}</Text>
                            </View>
                          </View>
                          <MiniBar value={score} color={meta.accent} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.diagram}>
                  <View style={styles.radarWrap}>
                    <RadarChart domainScores={scores.domainScores} />
                    <View style={styles.radarCenter} pointerEvents="none">
                      <Text style={styles.radarScore}>{balanceScore}</Text>
                      <View style={[styles.statusBadge, shadow("sm")]}>
                        <View
                          style={[styles.statusDot, { backgroundColor: getStatusColor(balanceScore) }]}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(balanceScore) }]}>
                          {getStatusLabel(balanceScore)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
            </TutorialTarget>

            {/* ── Focus banner ───────────────────────── */}
            <Pressable
              onPress={() => openDomain(focusDomainKey)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.focus, shadow("md"), pressed && styles.pressed]}
            >
              <LinearGradient
                colors={focusMeta.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.focusAccent}
              />
              <View style={styles.focusBody}>
                <LinearGradient
                  colors={focusMeta.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.focusIconWrap}
                >
                  <Icon name={focusSuggestion.icon} size={18} color="#fff" />
                </LinearGradient>

                <View style={styles.focusTextBlock}>
                  <Text style={styles.focusTag}>SUGGESTED FOCUS</Text>
                  <Text style={styles.focusTitle}>{focusSuggestion.title}</Text>
                  <Text style={styles.focusText}>{focusSuggestion.text}</Text>
                </View>

                <Icon name="arrow_forward" size={20} color={colors.textMuted} />
              </View>
            </Pressable>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, paddingBottom: spacing.xl },
  pressed: { opacity: 0.75 },

  main: {
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },

  quote: {
    flexDirection: "row",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentSoftStrong,
    overflow: "hidden",
  },
  quoteAccent: {
    width: 3,
    backgroundColor: colors.pulseAccent,
  },
  quoteBody: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  quoteText: { ...type.bodyMedium, fontStyle: "italic", color: colors.textMuted },

  hero: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.sm },
  skeletonRing: {
    width: 172,
    height: 172,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBgTintAlt,
  },
  loadingText: { ...type.label, color: colors.textMuted, textAlign: "center", paddingTop: spacing.md },

  radarWrap: { width: "100%", position: "relative", alignItems: "center", justifyContent: "center" },
  radarCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  radarScore: {
    fontFamily: fonts.extrabold,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -1.5,
    color: colors.pulsePrimaryDark,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill },
  statusText: { ...type.caption, fontFamily: fonts.bold, fontSize: 13 },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  cardTitle: { ...type.label, fontFamily: fonts.bold, fontSize: 14, letterSpacing: -0.2, color: colors.text },

  overviewTabs: {
    flexDirection: "row",
    gap: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  overviewTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: spacing.sm,
    // Reserved so the active underline does not shift the row.
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  overviewTabActive: { borderBottomColor: colors.pulsePrimary },
  overviewTabText: { ...type.label, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  overviewTabTextActive: { fontFamily: fonts.bold, color: colors.pulsePrimaryDark },

  diagram: { gap: spacing.sm },

  domainList: { gap: spacing.sm },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  domainIconTile: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  domainDetail: { flex: 1, gap: 4 },
  domainTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  domainName: { ...type.label, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  domainScoreGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  domainScore: { ...type.h3, fontFamily: fonts.extrabold, fontSize: 16, lineHeight: 20 },
  domainBadge: {
    ...type.caption,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  minibar: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBgTintAlt,
    overflow: "hidden",
  },
  minibarFill: { height: "100%", borderRadius: radius.pill },

  focus: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  focusAccent: { width: 4 },
  focusBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  focusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  focusTextBlock: { flex: 1, gap: 2 },
  focusTag: { ...type.caption, fontSize: 10, letterSpacing: 1, color: colors.textMuted },
  focusTitle: { ...type.label, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  focusText: { ...type.caption, fontSize: 12, color: colors.textMuted },
});

export default Home;
