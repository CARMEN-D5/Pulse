import { StyleSheet, Text, View } from "react-native";

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
        Last {normalizedScores.length} official week{normalizedScores.length === 1 ? "" : "s"}
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
    backgroundColor: "#0f131b",
    borderColor: "#0f131b",
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 16
  },
  barTrackActive: {
    borderColor: "#8ba3ff"
  },
  caption: {
    color: "#8f99b3",
    fontSize: 12,
    lineHeight: 16
  },
  card: {
    backgroundColor: "#10141d",
    borderColor: "#293040",
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: "100%"
  },
  change: {
    color: "#8ba3ff",
    fontSize: 12,
    fontWeight: "700"
  },
  chartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8
  },
  currentScore: {
    color: "#ffffff",
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
    color: "#f2f5ff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20
  }
});
