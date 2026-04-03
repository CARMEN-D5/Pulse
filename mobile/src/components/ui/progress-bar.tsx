import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

type ProgressBarProps = {
  accentColor: string;
  label: string;
  showValue?: boolean;
  value: number;
};

export function ProgressBar({ accentColor, label, showValue = true, value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {showValue ? <Text style={styles.value}>{clamped.toFixed(0)}</Text> : null}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: accentColor,
              width: `${Math.max(8, clamped)}%`
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: theme.radii.pill,
    height: "100%"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  label: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    lineHeight: 22
  },
  track: {
    backgroundColor: "rgba(8, 106, 105, 0.08)",
    borderRadius: theme.radii.pill,
    height: 8,
    overflow: "hidden"
  },
  value: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  wrapper: {
    gap: 8
  }
});
