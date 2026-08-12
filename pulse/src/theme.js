// Pulse design tokens.
//
// These are the same values the web build kept in the `:root` block of
// src/pages/auth.css. React Native has no CSS custom properties, so the
// tokens live here as plain JS and every StyleSheet imports what it needs.
//
// Two palettes coexist, exactly as they did on the web:
//   `colors.pulse*`  — the original pink/rose auth + splash styling
//   `colors.bl*`     — the "Balanced Life" teal/plum system used by the
//                      dashboard and the domain pages
import { Platform } from "react-native";

export const colors = {
  // Pulse (rose)
  pulsePrimary: "#ff4d6d",
  pulsePrimaryDark: "#c9184a",
  pulseAccent: "#ff8fa3",
  pulseBg: "#fff5f7",
  pulseBgTint: "#ffe3e8",
  pulseBgTintAlt: "#fde9ef",
  card: "#ffffff",
  text: "#1f1f2e",
  textMuted: "#6b6b7a",
  border: "#eadfe3",
  error: "#d64545",
  success: "#2f9e7a",

  // Chrome + list surfaces introduced by the Sprint 4 UI refinement mockups:
  // a translucent rose app bar and tab bar, the very light rose used to tint
  // alternating rows, and the lavender the quote banner and the active tab
  // pill are painted with.
  appBar: "rgba(253, 231, 235, 0.94)",
  tabBar: "rgba(255, 255, 255, 0.96)",
  rowTint: "#fdf1f4",
  accentSoft: "#eef0fb",
  accentSoftStrong: "#e4e3f7",

  // Balanced Life (teal / plum)
  blPrimary: "#086a69",
  blPrimaryDim: "#005d5c",
  blOnPrimary: "#e0fffd",
  blTertiary: "#983f72",
  blBg: "#f8faf1",
  blOnSurface: "#2e342a",
  blOnSurfaceVariant: "#5b6156",
  blOutline: "#767d70",
  blOutlineVariant: "#aeb4a6",
  blPrimaryContainer: "#9cebe8",
  blTertiaryContainer: "#ff98cd",
  blError: "#ac3434",

  // Translucent fills used by the glass-card look. `backdrop-filter` has no
  // React Native equivalent, so the surfaces below are tuned to read as
  // frosted glass on their own (higher alpha than the web values).
  glass: "rgba(255, 255, 255, 0.72)",
  glassStrong: "rgba(255, 255, 255, 0.88)",
  glassBorder: "rgba(255, 255, 255, 0.6)",
  overlay: "rgba(46, 52, 42, 0.45)",
};

// Domain accent colours, keyed by the domain ids the scoring engine uses.
export const domainColors = {
  health: "#e8617d",
  relationships: "#983f72",
  spirituality: "#086a69",
  productivity: "#3a6ea5",
  finance: "#c07f2c",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

// Manrope is loaded at startup by useAppFonts (src/hooks/useAppFonts.js).
// Naming the weights explicitly matters on Android, where `fontWeight` on a
// custom family is ignored and the family name itself carries the weight.
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
};

export const type = {
  h1: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  h3: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 28 },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16 },
};

// `box-shadow` maps to elevation on Android and to the shadow* props on iOS.
// Web (react-native-web) understands the iOS props, so one object covers all
// three platforms.
export const shadow = (level = "md") => {
  const presets = {
    sm: { offsetY: 2, radius: 6, opacity: 0.06, elevation: 2 },
    md: { offsetY: 8, radius: 18, opacity: 0.08, elevation: 4 },
    lg: { offsetY: 20, radius: 36, opacity: 0.12, elevation: 8 },
  };
  const p = presets[level] ?? presets.md;
  return Platform.select({
    android: { elevation: p.elevation },
    default: {
      shadowColor: "#2e342a",
      shadowOffset: { width: 0, height: p.offsetY },
      shadowOpacity: p.opacity,
      shadowRadius: p.radius,
    },
  });
};

// The web build painted a 160deg three-stop gradient on every auth screen.
// Rendering a real gradient needs react-native-svg; screens that want it use
// <ScreenGradient> (src/components/ScreenGradient.js) and these stops.
export const bgGradient = {
  colors: [colors.pulseBgTint, colors.pulseBg, colors.pulseBgTintAlt],
  stops: [0, 0.45, 1],
};

export default { colors, domainColors, spacing, radius, fonts, type, shadow, bgGradient };
