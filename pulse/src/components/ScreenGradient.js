// The soft 160deg rose gradient that sat behind every screen on the web
// (`--pulse-bg-gradient`). React Native has no CSS gradients, so it is drawn
// as an absolutely-positioned SVG behind the screen content.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { bgGradient, colors } from "../theme";

export default function ScreenGradient({ children, style, colors: stopColors = bgGradient.colors }) {
  return (
    <View style={[styles.root, style]}>
      {/* 160deg in CSS runs top-left to bottom-right; x1/y1 -> x2/y2 below is
          the closest equivalent SVG can express with a linear gradient. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="screenBg" x1="0.35" y1="0" x2="0.65" y2="1">
            {stopColors.map((color, i) => (
              <Stop
                key={color + i}
                offset={bgGradient.stops[i] ?? i / (stopColors.length - 1)}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenBg)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pulseBg,
  },
});
