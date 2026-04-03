import { StyleSheet, Text, View } from "react-native";

import { createShadow, theme } from "@/theme/tokens";

type ScoreRingProps = {
  accentColor?: string;
  caption: string;
  value: number;
};

export function ScoreRing({ accentColor = theme.colors.primary, caption, value }: ScoreRingProps) {
  return (
    <View style={[styles.ring, { borderColor: accentColor }]}>
      <Text style={[styles.value, { color: accentColor }]}>{Math.round(value)}</Text>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  ring: {
    ...createShadow("sm"),
    alignItems: "center",
    borderRadius: theme.radii.pill,
    borderWidth: 6,
    height: 132,
    justifyContent: "center",
    width: 132
  },
  value: {
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 48
  }
});
