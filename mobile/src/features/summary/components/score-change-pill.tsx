import { StyleSheet, Text, View } from "react-native";

type ScoreChangePillProps = {
  change: number | null;
  label?: string;
};

export function ScoreChangePill({ change, label = "vs prev" }: ScoreChangePillProps) {
  if (change == null) {
    return (
      <View style={[styles.base, styles.neutral]}>
        <Text style={styles.label}>No prior week</Text>
      </View>
    );
  }

  const rounded = Math.round(change * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  const toneStyle = rounded > 0 ? styles.positive : rounded < 0 ? styles.negative : styles.neutral;

  return (
    <View style={[styles.base, toneStyle]}>
      <Text style={styles.label}>
        {sign}
        {rounded.toFixed(1)} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  positive: {
    backgroundColor: "#163126"
  },
  negative: {
    backgroundColor: "#3a1b24"
  },
  neutral: {
    backgroundColor: "#1f2533"
  },
  label: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700"
  }
});
