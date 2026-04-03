import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

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
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  positive: {
    backgroundColor: "rgba(47, 140, 104, 0.14)",
    borderColor: "rgba(47, 140, 104, 0.18)"
  },
  negative: {
    backgroundColor: "rgba(172, 52, 52, 0.12)",
    borderColor: "rgba(172, 52, 52, 0.16)"
  },
  neutral: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: theme.colors.borderMuted
  },
  label: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700"
  }
});
