import { StyleSheet, Text, View } from "react-native";

type ScoreProgressBarProps = {
  label: string;
  score: number;
  detail?: string;
};

function getToneColor(score: number) {
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

export function ScoreProgressBar({ detail, label, score }: ScoreProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const barColor = getToneColor(clamped);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.score}>{clamped.toFixed(1)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: barColor, width: `${clamped}%` }]} />
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: "#d7def0",
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  score: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  track: {
    backgroundColor: "#0f131b",
    borderRadius: 999,
    height: 10,
    overflow: "hidden"
  },
  fill: {
    borderRadius: 999,
    height: "100%"
  },
  detail: {
    color: "#95a1be",
    fontSize: 13,
    lineHeight: 18
  }
});
