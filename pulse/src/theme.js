// Pulse design tokens.
//
// Two palettes unified by a warm temperature shift:
//   `colors.pulse*`  — warm rose (dashboard, chrome, social)
//   `colors.bl*`     — warm sage (auth, splash, domain accents)
import { Platform } from "react-native";

export const colors = {
  // Pulse (warm rose)
  pulsePrimary: "#E0546E",
  pulsePrimaryDark: "#B33D54",
  pulseAccent: "#E8889A",
  pulseBg: "#FBF6F2",
  pulseBgTint: "#F2E3DC",
  pulseBgTintAlt: "#F5EAE5",
  card: "#ffffff",
  text: "#2A2523",
  textMuted: "#7D756F",
  border: "#E6DCD6",
  error: "#C94040",
  success: "#3A8F70",

  appBar: "rgba(251, 244, 239, 0.94)",
  tabBar: "rgba(255, 255, 255, 0.96)",
  rowTint: "#F6EFEB",
  accentSoft: "#EEEAF4",
  accentSoftStrong: "#E2DDEC",

  // Balanced Life (warm sage)
  blPrimary: "#2A7A6A",
  blPrimaryDim: "#1D665A",
  blOnPrimary: "#E5FAF3",
  blTertiary: "#8E4570",
  blBg: "#F7F5F0",
  blOnSurface: "#2A2523",
  blOnSurfaceVariant: "#6B635C",
  blOutline: "#847D76",
  blOutlineVariant: "#B5ADA5",
  blPrimaryContainer: "#A8E6D8",
  blTertiaryContainer: "#F0A0C2",
  blError: "#B33A3A",

  glass: "rgba(255, 255, 255, 0.75)",
  glassStrong: "rgba(255, 255, 255, 0.90)",
  glassBorder: "rgba(255, 255, 255, 0.55)",
  overlay: "rgba(42, 37, 35, 0.45)",
};

// Canonical domain palette. Keep domain identity stable across onboarding,
// Home, missions and Profile while softening saturation for Pulse's warm
// cream/pink surfaces.
export const DOMAIN_COLORS = Object.freeze({
  spirituality: "#D9BE78",
  health: "#C98692",
  relationships: "#AA96BE",
  finance: "#82A58E",
  productivity: "#819CB6",
});

// Backwards-compatible alias for older imports. New UI should prefer the
// richer `domains` tokens below.
export const domainColors = DOMAIN_COLORS;

// Canonical per-domain design tokens — single source of truth for the color
// and icon shown for a domain anywhere in the app (Home, missions, analytics,
// Features, etc.). Shades are deliberately kept away from `colors.error`
// (#C94040) and `colors.success` (#3A8F70) so a domain accent is never
// mistaken for a status color.
export const domains = {
  spirituality: {
    icon: "auto_awesome",
    color: DOMAIN_COLORS.spirituality,
    light: "#F8F2E7",
    text: "#705D38",
    accent: DOMAIN_COLORS.spirituality,
    gradient: ["#CBB174", DOMAIN_COLORS.spirituality],
  },
  relationships: {
    icon: "groups",
    color: DOMAIN_COLORS.relationships,
    light: "#F3EFF6",
    text: "#6E5E7C",
    accent: DOMAIN_COLORS.relationships,
    gradient: ["#9583A8", DOMAIN_COLORS.relationships],
  },
  productivity: {
    icon: "business_center",
    color: DOMAIN_COLORS.productivity,
    light: "#EEF3F6",
    text: "#556D84",
    accent: DOMAIN_COLORS.productivity,
    gradient: ["#718BA4", DOMAIN_COLORS.productivity],
  },
  health: {
    icon: "favorite",
    color: DOMAIN_COLORS.health,
    light: "#F8EEF0",
    text: "#865763",
    accent: DOMAIN_COLORS.health,
    gradient: ["#B57582", DOMAIN_COLORS.health],
  },
  finance: {
    icon: "payments",
    color: DOMAIN_COLORS.finance,
    light: "#EFF5F1",
    text: "#55705F",
    accent: DOMAIN_COLORS.finance,
    gradient: ["#72927D", DOMAIN_COLORS.finance],
  },
};

// Profile analytics uses a neutral lavender/slate accent so score history is
// visually distinct from red status messaging and the Health domain colour.
export const profileColors = Object.freeze({
  accent: "#B96A7E",
  gradient: ["#FFF8F8", "#FAF3F5"],
  soft: "rgba(185, 106, 126, 0.10)",
  trend: Object.freeze({
    positive: Object.freeze({ text: "#4F9B78", background: "#EEF7F2" }),
    negative: Object.freeze({ text: "#C85F78", background: "#FBEFF2" }),
    neutral: Object.freeze({ text: "#88827F", background: "#F4F2F1" }),
  }),
});

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

export const shadow = (level = "md") => {
  const presets = {
    sm: { offsetY: 2, radius: 8, opacity: 0.06, elevation: 2 },
    md: { offsetY: 6, radius: 20, opacity: 0.08, elevation: 4 },
    lg: { offsetY: 16, radius: 36, opacity: 0.11, elevation: 8 },
  };
  const p = presets[level] ?? presets.md;
  return Platform.select({
    android: { elevation: p.elevation },
    default: {
      shadowColor: "#3D3530",
      shadowOffset: { width: 0, height: p.offsetY },
      shadowOpacity: p.opacity,
      shadowRadius: p.radius,
    },
  });
};

// Four-stop gradient: warm peach → cream → subtle mauve → warm blush.
// Creates an atmospheric warmth instead of a flat pink wash.
export const bgGradient = {
  colors: ["#F2E0D6", "#FBF6F2", "#F0E8EE", "#F5EAE5"],
  stops: [0, 0.35, 0.7, 1],
};

export default {
  colors,
  DOMAIN_COLORS,
  domainColors,
  domains,
  profileColors,
  spacing,
  radius,
  fonts,
  type,
  shadow,
  bgGradient,
};
