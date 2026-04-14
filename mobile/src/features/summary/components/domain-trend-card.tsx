import { StyleSheet, Text, View } from "react-native";

import { createShadow, theme } from "@/theme/tokens";

type DomainTrendCardProps = {
  changeLabel: string;
  currentScore: number;
  highlightIndex?: number;
  label: string;
  scores: number[];
};

function getBarColor(score: number) {
  if (score >= 75) {
    return "#6fd1a7";
  }

  if (score >= 55) {
    return "#7a94ff";
  }

  if (score >= 35) {
    return "#f5b56d";
  }

  return "#ff8a94";
}

export function DomainTrendCard({
  changeLabel,
  currentScore,
  highlightIndex,
  label,
  scores
}: DomainTrendCardProps) {
  const normalizedScores = scores.map((score) => Math.max(0, Math.min(100, score)));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headingWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.change}>{changeLabel}</Text>
        </View>
        <Text style={styles.currentScore}>{currentScore.toFixed(1)}</Text>
      </View>

      <View style={styles.chartRow}>
        {normalizedScores.map((score, index) => (
          <View key={`${label}-${index}`} style={styles.barColumn}>
            <View style={[styles.barTrack, index === highlightIndex ? styles.barTrackActive : null]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: getBarColor(score),
                    height: `${Math.max(score, 8)}%`
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.caption}>
        Last {normalizedScores.length} saved week{normalizedScores.length === 1 ? "" : "s"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barColumn: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end"
  },
  barFill: {
    borderRadius: 999,
    minHeight: 8,
    width: "100%"
  },
  barTrack: {
    alignItems: "flex-end",
    backgroundColor: "rgba(8, 106, 105, 0.08)",
    borderColor: "rgba(118, 125, 112, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 16
  },
  barTrackActive: {
    borderColor: "rgba(8, 106, 105, 0.35)"
  },
  caption: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 16
  },
  card: {
    ...createShadow("sm"),
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: "100%"
  },
  change: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  chartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8
  },
  currentScore: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800"
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  headingWrap: {
    flex: 1,
    gap: 4,
    paddingRight: 12
  },
  label: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  }
});
