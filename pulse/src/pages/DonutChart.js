import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { colors, fonts, type } from "../theme";

/**
 * Animated SVG donut chart.
 *
 * Each slice is its own <Circle> with the same circumference, positioned
 * around the donut by adjusting `strokeDashoffset`. The visible portion of
 * each slice grows from 0 -> its share of the total.
 *
 * On the web this animated with a CSS transition and revealed a slice's
 * detail on hover. Phones have no hover, so the reveal is driven by tapping a
 * slice instead — tap again (or tap another) to switch, and the centre label
 * falls back to the summary when nothing is selected.
 *
 * Props:
 *   data: [{ id, label, value, color }]
 *   size: number (px) — overall chart size
 *   thickness: number (px) — donut ring thickness
 *   centerLabel: string — line 1 of the centre text (e.g. "$487")
 *   centerSub: string — line 2 of the centre text (e.g. "spent")
 */
function DonutChart({ data = [], size = 220, thickness = 28, centerLabel = "", centerSub = "" }) {
  // Animate from 0 -> real values on mount.
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    // One frame at 0 so the growth is visible rather than instant.
    const raf = requestAnimationFrame(() => setProgress(1));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Compute each slice's offset along the ring.
  let cumulative = 0;
  const slices = data.map((d) => {
    const fraction = total > 0 ? (d.value || 0) / total : 0;
    const offset = cumulative;
    cumulative += fraction;
    return { ...d, fraction, offset };
  });

  // Empty state — show a faint full ring so the chart never looks broken.
  if (total === 0) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Svg width={size} height={size} accessibilityLabel="No expenses logged yet">
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1e1e6" strokeWidth={thickness} />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerMain}>$0</Text>
          <Text style={styles.centerSub}>no expenses yet</Text>
        </View>
      </View>
    );
  }

  const active = slices.find((s) => s.id === activeId);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} accessibilityLabel="Spending breakdown by category">
        {/* Rotate so slices start at 12 o'clock instead of 3 o'clock. */}
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {/* Faint background ring so partial donuts still look complete. */}
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#f7eaef" strokeWidth={thickness} />

          {slices.map((slice) => {
            const animatedFraction = slice.fraction * progress;
            const dashLen = animatedFraction * circumference;
            const gapLen = circumference - dashLen;
            const isActive = activeId === slice.id;

            return (
              <Circle
                key={slice.id}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={slice.color}
                strokeWidth={isActive ? thickness + 4 : thickness}
                strokeDasharray={`${dashLen} ${gapLen}`}
                strokeDashoffset={-slice.offset * circumference}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>

      {/* Legend-free tap targets: one row of dots under the chart would
          double the height, so the centre doubles as the readout and the
          slices are selected from the list the parent screen renders. This
          Pressable cycles through slices for keyboard/screen-reader users. */}
      <Pressable
        style={styles.center}
        onPress={() => {
          const i = slices.findIndex((s) => s.id === activeId);
          setActiveId(i === slices.length - 1 ? null : slices[i + 1].id);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          active
            ? `${active.label}: ${active.value.toFixed(2)}, ${Math.round(active.fraction * 100)} percent. Tap for next category.`
            : `${centerLabel} ${centerSub}. Tap to inspect each category.`
        }
      >
        {active ? (
          <>
            <Text style={[styles.centerMain, { color: active.color }]}>
              ${active.value.toFixed(0)}
            </Text>
            <Text style={styles.centerSub}>
              {active.label} · {Math.round(active.fraction * 100)}%
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.centerMain}>{centerLabel}</Text>
            <Text style={styles.centerSub}>{centerSub}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerMain: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
  },
  centerSub: { ...type.caption, color: colors.textMuted, textAlign: "center" },
});

export default DonutChart;
