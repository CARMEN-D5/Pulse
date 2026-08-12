import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

import Icon from "../components/Icon";
import { EmptyState, Loading, Screen, ScreenHeader } from "../components/ui";
import { db } from "../firebase";
import { seedDummyWeeklyScores } from "../firestore/seedDummyScores";
import { DOMAINS, DOMAIN_KEYS } from "../scoring/scoringEngine";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";

/* ── Domain config ─────────────────────────────────────────── */
const DOMAIN_META = {
  spirituality:  { icon: "auto_awesome", color: "#086a69", label: "Spirit" },
  relationships: { icon: "groups",       color: "#4e607f", label: "Social" },
  productivity:  { icon: "work",         color: "#5a6550", label: "Work" },
  health:        { icon: "favorite",     color: "#c9184a", label: "Health" },
  finance:       { icon: "payments",     color: "#983f72", label: "Finance" },
};

const RANGE_OPTIONS = [
  { label: "4 Weeks", value: 4 },
  { label: "8 Weeks", value: 8 },
  { label: "12 Weeks", value: 12 },
];

/* ── Smooth path helper ────────────────────────────────────── */
function smoothPath(points) {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0][0]},${points[0][1]} L ${points[1][0]},${points[1][1]}`;

  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const t = 0.25;
    d += ` C ${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/* ── SVG line chart ────────────────────────────────────────── */
const W = 360, H = 200;
const PX = 8, PT = 12, PB = 24;
const CW = W - PX * 2, CH = H - PT - PB;

function TrendChart({ data, color }) {
  const pts = useMemo(() => {
    if (!data || !data.length) return [];
    return data.map((v, i) => [
      PX + (data.length === 1 ? CW / 2 : (i / (data.length - 1)) * CW),
      PT + CH - (v / 100) * CH,
    ]);
  }, [data]);

  const line = useMemo(() => smoothPath(pts), [pts]);
  const area = useMemo(() => {
    if (!line || !pts.length) return "";
    return `${line} L ${pts[pts.length - 1][0]},${PT + CH} L ${pts[0][0]},${PT + CH} Z`;
  }, [line, pts]);

  if (!data || !data.length) return null;

  return (
    <View style={styles.chartArea}>
      {/* Grid lines at 33% and 66% */}
      <View style={[styles.gridline, { bottom: "33%" }]} />
      <View style={[styles.gridline, { bottom: "66%" }]} />

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgLinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {area ? <Path d={area} fill="url(#trendFill)" /> : null}
        {line ? (
          <Path d={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
        ) : null}

        {pts.map(([x, y], i) => (
          <Circle
            key={i}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 5 : 4}
            fill={i === pts.length - 1 ? color : "#fff"}
            stroke={i === pts.length - 1 ? "#fff" : color}
            strokeWidth="2"
          />
        ))}
      </Svg>

      {/* Week labels */}
      <View style={styles.chartLabels}>
        {data.map((_, i) => {
          if (data.length > 6 && i % 2 !== 0 && i !== data.length - 1) return null;
          return (
            <Text key={i} style={styles.chartLabel}>
              WEEK {i + 1}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/* ── Insight description generator ─────────────────────────── */
function getInsightText(key, diff) {
  const r = Math.abs(Math.round(diff));
  if (key === "health") {
    return diff >= 0
      ? `Your consistency has improved your overall health score by ${r} points. This is your primary growth driver.`
      : `Your health score dipped ${r} points. Consider re-establishing routines to regain momentum.`;
  }
  if (key === "productivity") {
    return diff >= 0
      ? `Productivity is trending upward with ${r} points of growth. Keep building on task completion streaks.`
      : `Slight dip in work satisfaction identified. Reviewing task loads or environment might be beneficial.`;
  }
  if (key === "spirituality") {
    return diff >= 0
      ? `Mindfulness practice is paying off with ${r} points improvement. Your spiritual alignment is strengthening.`
      : `Spiritual score declined ${r} points. Try resuming meditation or journaling sessions.`;
  }
  if (key === "relationships") {
    return diff >= 0
      ? `Social connections are strengthening — up ${r} points. Meaningful relationships continue to deepen.`
      : `Relationship score is down ${r} points. Reach out to someone you care about today.`;
  }
  if (key === "finance") {
    return diff >= 0
      ? `Financial wellbeing improved ${r} points. Budget tracking and savings habits are working.`
      : `Financial score dropped ${r} points. Review your spending patterns and budget goals.`;
  }
  return `Score changed by ${diff >= 0 ? "+" : ""}${r} points over the selected period.`;
}

/* ── Main component ───────────────────────────────────────────
   Renders standalone (its own gradient + back arrow) or embedded in the
   Profile tab, where <AppShell> already paints the background and the header
   is supplied by the caller.

   `renderHeader` is a function so the embedding screen can hang the sample-data
   action off its own settings menu:
       renderHeader({ onSeed, seeding }) => node                            */
function ProgressAnalytics({ user, onBack, embedded = false, renderHeader }) {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(8);
  const [selectedDomain, setSelectedDomain] = useState("overall");
  const [seeding, setSeeding] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  /* Fetch */
  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const ref = collection(db, "users", user.uid, "weeklyScores");
    getDocs(query(ref, orderBy("weekId", "desc"), limit(12)))
      .then((snap) => {
        const docs = snap.docs.map((d) => d.data());
        docs.reverse();
        setWeeklyData(docs);
      })
      .catch(() => setWeeklyData([]))
      .finally(() => setLoading(false));
  }, [user, fetchKey]);

  /* Seed */
  const handleSeed = useCallback(async () => {
    if (!user?.uid || seeding) return;
    setSeeding(true);
    try {
      const r = await seedDummyWeeklyScores(user.uid);
      if (r.ok) setFetchKey((k) => k + 1);
    } finally {
      setSeeding(false);
    }
  }, [user, seeding]);

  /* Derived data */
  const filtered = useMemo(() => {
    if (weeklyData.length <= range) return weeklyData;
    return weeklyData.slice(weeklyData.length - range);
  }, [weeklyData, range]);

  const chartData = useMemo(() => {
    if (selectedDomain === "overall")
      return filtered.map((w) => Math.round(w.balancedLifeScore ?? 0));
    return filtered.map((w) => Math.round(w.domains?.[selectedDomain]?.finalScore ?? 0));
  }, [filtered, selectedDomain]);

  const currentScore = useMemo(() => {
    if (!filtered.length) return 0;
    const last = filtered[filtered.length - 1];
    return Math.round(
      selectedDomain === "overall"
        ? last.balancedLifeScore ?? 0
        : last.domains?.[selectedDomain]?.finalScore ?? 0
    );
  }, [filtered, selectedDomain]);

  const growth = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const fs = selectedDomain === "overall" ? first.balancedLifeScore ?? 0 : first.domains?.[selectedDomain]?.finalScore ?? 0;
    const ls = selectedDomain === "overall" ? last.balancedLifeScore ?? 0 : last.domains?.[selectedDomain]?.finalScore ?? 0;
    if (fs === 0) return null;
    return (((ls - fs) / fs) * 100).toFixed(1);
  }, [filtered, selectedDomain]);

  const avgGrowthPts = useMemo(() => {
    if (filtered.length < 2) return null;
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const fs = selectedDomain === "overall" ? first.balancedLifeScore ?? 0 : first.domains?.[selectedDomain]?.finalScore ?? 0;
    const ls = selectedDomain === "overall" ? last.balancedLifeScore ?? 0 : last.domains?.[selectedDomain]?.finalScore ?? 0;
    return ((ls - fs) / (filtered.length - 1)).toFixed(1);
  }, [filtered, selectedDomain]);

  const insights = useMemo(() => {
    if (!filtered.length) return [];
    const last = filtered[filtered.length - 1];
    const first = filtered[0];
    return DOMAIN_KEYS.map((key) => {
      const score = Math.round(last.domains?.[key]?.finalScore ?? 0);
      const firstScore = Math.round(first.domains?.[key]?.finalScore ?? 0);
      return { key, score, diff: score - firstScore, ...DOMAIN_META[key] };
    });
  }, [filtered]);

  const chartColor =
    selectedDomain === "overall" ? "#086a69" : DOMAIN_META[selectedDomain]?.color ?? "#086a69";
  const activeLabel =
    selectedDomain === "overall" ? "Overall Balance Score" : DOMAIN_META[selectedDomain]?.label;

  return (
    <Screen
      contentContainerStyle={styles.screen}
      keyboardAvoiding={false}
      gradient={!embedded}
      safeArea={!embedded}
    >
      {renderHeader ? (
        renderHeader({ onSeed: handleSeed, seeding })
      ) : (
        <ScreenHeader
          title="Progress Analytics"
          onBack={onBack}
          right={
            <Pressable
              onPress={handleSeed}
              disabled={seeding}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Generate test data"
              style={({ pressed }) => [styles.seedBtn, (pressed || seeding) && styles.pressed]}
            >
              <Icon
                name={seeding ? "hourglass_top" : "science"}
                size={20}
                color={colors.blPrimary}
              />
            </Pressable>
          }
        />
      )}

      {/* ── Range toggles ── */}
      <View style={styles.rangeBar}>
        {RANGE_OPTIONS.map((o) => {
          const activeRange = range === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setRange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activeRange }}
              style={[styles.rangeOption, activeRange && styles.rangeOptionActive]}
            >
              <Text style={[styles.rangeText, activeRange && styles.rangeTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <Loading label="Loading your history…" style={styles.loading} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="analytics"
          title="No Weekly Data Yet"
          message="Complete weekly reflections or tap the flask icon to generate test data."
          style={styles.loading}
        />
      ) : (
        <>
          {/* ── Overall score card (teal gradient) ── */}
          <LinearGradient
            colors={["#086a69", "#005d5c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.scoreCard, shadow("lg")]}
          >
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreTitle}>{activeLabel}</Text>
              <Text style={styles.scoreSub}>
                Your{" "}
                {selectedDomain === "overall"
                  ? "average across all life domains"
                  : `${DOMAINS[selectedDomain]?.label} domain score`}{" "}
                over the last {range} weeks.
              </Text>
            </View>

            <View style={styles.scorePill}>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreNum}>{currentScore}</Text>
                <Text style={styles.scoreLabel}>CURRENT</Text>
              </View>
              <View style={styles.scoreDivider} />
              <View style={styles.scoreCol}>
                {growth !== null ? (
                  <View style={styles.scoreGrowthRow}>
                    <Icon
                      name={parseFloat(growth) >= 0 ? "trending_up" : "trending_down"}
                      size={16}
                      color="#9cebe8"
                    />
                    <Text style={styles.scoreGrowth}>
                      {parseFloat(growth) >= 0 ? "+" : ""}
                      {growth}%
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.scoreGrowth}>—</Text>
                )}
                <Text style={styles.scoreLabel}>GROWTH</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Trend chart card ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detailed Performance Trends</Text>

            <View style={[styles.trendCard, shadow("md")]}>
              <View style={styles.trendTop}>
                <View style={styles.flex}>
                  <Text style={styles.trendLabel}>SELECTED METRIC</Text>
                  <Text style={styles.trendHeading}>Balance Score History</Text>
                </View>
                {avgGrowthPts !== null ? (
                  <View style={styles.trendBadge}>
                    <Icon name="arrow_upward" size={14} color={colors.blPrimary} />
                    <Text style={styles.trendBadgeText}>{avgGrowthPts} pts avg.</Text>
                  </View>
                ) : null}
              </View>

              <TrendChart data={chartData} color={chartColor} />

              {/* Domain selector. The web build used a horizontally
                  overflowing flex row; a horizontal ScrollView is the React
                  Native equivalent. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.domainRow}
              >
                <DomainChip
                  icon="dashboard"
                  label="Overall"
                  active={selectedDomain === "overall"}
                  onPress={() => setSelectedDomain("overall")}
                />
                {DOMAIN_KEYS.map((key) => (
                  <DomainChip
                    key={key}
                    icon={DOMAIN_META[key].icon}
                    label={DOMAIN_META[key].label}
                    active={selectedDomain === key}
                    onPress={() => setSelectedDomain(key)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>

          {/* ── Strategic insights ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strategic Insights</Text>

            <View style={styles.insights}>
              {insights.map((ins) => {
                const up = ins.diff >= 0;
                return (
                  <View key={ins.key} style={[styles.insightCard, shadow("sm")]}>
                    <View style={styles.insightBody}>
                      <View style={[styles.insightIcon, { backgroundColor: `${ins.color}15` }]}>
                        <Icon name={ins.icon} size={20} color={ins.color} />
                      </View>

                      <View style={styles.insightContent}>
                        <Text style={styles.insightName}>
                          {DOMAINS[ins.key]?.label ?? ins.label}
                        </Text>
                        <Text style={styles.insightText}>{getInsightText(ins.key, ins.diff)}</Text>

                        <View style={styles.insightBarTrack}>
                          <View
                            style={[
                              styles.insightBarFill,
                              { width: `${ins.score}%`, backgroundColor: ins.color },
                            ]}
                          />
                        </View>

                        <View style={styles.insightStats}>
                          <Text style={styles.insightStatText}>Current: {ins.score}/100</Text>
                          <Text
                            style={[
                              styles.insightStatText,
                              { color: up ? "#086a69" : "#ac3434" },
                            ]}
                          >
                            {up ? "+" : ""}
                            {Math.round(ins.diff)} Trend
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

function DomainChip({ icon, label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.domainChip,
        active && styles.domainChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} size={16} color={active ? "#fff" : colors.textMuted} />
      <Text style={[styles.domainChipText, active && styles.domainChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  pressed: { opacity: 0.6 },
  loading: { paddingVertical: 60 },

  seedBtn: {
    padding: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(8, 106, 105, 0.08)",
  },

  rangeBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  rangeOptionActive: { backgroundColor: colors.blPrimary },
  rangeText: { ...type.label, fontSize: 12, color: colors.textMuted },
  rangeTextActive: { color: "#fff" },

  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: 20,
    padding: spacing.xl,
    overflow: "hidden",
  },
  scoreLeft: { flex: 1, minWidth: 0 },
  scoreTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: "rgba(255,255,255,0.95)", marginBottom: 6 },
  scoreSub: { ...type.caption, fontSize: 12, color: "rgba(255,255,255,0.65)" },

  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  scoreCol: { alignItems: "center", gap: 4 },
  scoreNum: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 34, letterSpacing: -1, color: "#fff" },
  scoreGrowthRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  scoreGrowth: { ...type.title, fontFamily: fonts.bold, fontSize: 16, color: "#9cebe8" },
  scoreLabel: { ...type.caption, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.55)" },
  scoreDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.2)" },

  section: { gap: spacing.md },
  sectionTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  trendCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  trendTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  trendLabel: { ...type.caption, fontSize: 9, letterSpacing: 1, color: colors.textMuted },
  trendHeading: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(8, 106, 105, 0.08)",
  },
  trendBadgeText: { ...type.caption, fontSize: 11, color: colors.blPrimary },

  chartArea: { position: "relative" },
  gridline: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  chartLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  chartLabel: { ...type.caption, fontSize: 9, letterSpacing: 0.5, color: colors.textMuted },

  domainRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  domainChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  domainChipActive: { backgroundColor: colors.blPrimary, borderColor: colors.blPrimary },
  domainChipText: { ...type.caption, fontSize: 12, color: colors.textMuted },
  domainChipTextActive: { color: "#fff" },

  insights: { gap: spacing.md },
  insightCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  insightBody: { flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  insightContent: { flex: 1, gap: 6 },
  insightName: { ...type.label, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  insightText: { ...type.caption, fontSize: 12, color: colors.textMuted },
  insightBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBgTintAlt,
    overflow: "hidden",
  },
  insightBarFill: { height: "100%", borderRadius: radius.pill },
  insightStats: { flexDirection: "row", justifyContent: "space-between" },
  insightStatText: { ...type.caption, fontSize: 11, color: colors.textMuted },
});

export default ProgressAnalytics;
