import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.md * 2 - SPACING.lg * 2 - 40;

interface DataPoint {
  value: number;
  label?: string;
  date?: string;
}

interface Props {
  title: string;
  data: DataPoint[];
  color?: string;
  showArea?: boolean;
  /** Optional second dataset to overlay */
  data2?: DataPoint[];
  color2?: string;
}

export function TrendLineChart({
  title,
  data,
  color = COLORS.primary,
  showArea = true,
  data2,
  color2,
}: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      </View>
    );
  }

  // Calculate label spacing — show ~5-7 labels max
  const labelInterval = Math.max(1, Math.ceil(data.length / 6));
  const labeledData = data.map((d, i) => ({
    ...d,
    label: i % labelInterval === 0 ? d.label : "",
  }));

  // Current and previous values for summary
  const currentValue = data[data.length - 1]?.value ?? 0;
  const previousValue = data.length >= 2 ? data[data.length - 2]?.value : null;
  const change = previousValue != null ? currentValue - previousValue : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.currentScore}>
          <Text style={[styles.scoreValue, { color }]}>{currentValue}</Text>
          {change != null && change !== 0 && (
            <Text
              style={[
                styles.changeText,
                { color: change > 0 ? COLORS.success : COLORS.error },
              ]}
            >
              {change > 0 ? "+" : ""}
              {Math.round(change * 10) / 10}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={labeledData}
          data2={data2}
          width={CHART_WIDTH}
          height={160}
          spacing={Math.max(20, CHART_WIDTH / Math.max(data.length - 1, 1))}
          color={color}
          color2={color2}
          thickness={2.5}
          thickness2={2}
          dataPointsColor={color}
          dataPointsColor2={color2}
          dataPointsRadius={data.length <= 14 ? 4 : 0}
          dataPointsRadius2={0}
          startFillColor={showArea ? color : "transparent"}
          endFillColor={showArea ? color : "transparent"}
          startOpacity={showArea ? 0.15 : 0}
          endOpacity={0}
          areaChart={showArea}
          curved
          maxValue={100}
          noOfSections={4}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={COLORS.border}
          rulesColor={COLORS.border}
          rulesType="dashed"
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          hideDataPoints={data.length > 14}
          pointerConfig={{
            pointerStripColor: COLORS.border,
            pointerStripWidth: 1,
            pointerColor: color,
            radius: 5,
            pointerLabelWidth: 80,
            pointerLabelHeight: 30,
            pointerLabelComponent: (items: any[]) => (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{items[0]?.value}</Text>
              </View>
            ),
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  currentScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  scoreValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
  },
  changeText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  chartWrapper: {
    marginLeft: -10,
  },
  axisText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emptyChart: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  tooltip: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
});
