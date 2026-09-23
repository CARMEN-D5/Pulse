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

export const domainColors = {
  health: "#E0546E",
  relationships: "#8E4570",
  spirituality: "#2A7A6A",
  productivity: "#4A6D98",
  finance: "#C48030",
};

// Canonical per-domain design tokens — single source of truth for the color
// and icon shown for a domain anywhere in the app (Home, missions, analytics,
// Features, etc.). Shades are deliberately kept away from `colors.error`
// (#C94040) and `colors.success` (#3A8F70) so a domain accent is never
// mistaken for a status color.
export const domains = {
  spirituality: {
    icon: "auto_awesome",
    color: "#C9971F",
    light: "#FBF2DE",
    text: "#8A6A15",
    accent: "#E0B23F",
    gradient: ["#B3841A", "#DDA82F"],
  },
  relationships: {
    icon: "groups",
    color: "#7A4FA3",
    light: "#F1EAF7",
    text: "#5E3B80",
    accent: "#9A6FC0",
    gradient: ["#6A4090", "#8E5FB8"],
  },
  productivity: {
    icon: "business_center",
    color: "#3A72B8",
    light: "#E7F0FA",
    text: "#2C588F",
    accent: "#5B8FCC",
    gradient: ["#2C588F", "#4A82C0"],
  },
  health: {
    icon: "favorite",
    color: "#D1435E",
    light: "#FAE6EA",
    text: "#A82F46",
    accent: "#DE6B82",
    gradient: ["#A82F46", "#D1435E"],
  },
  finance: {
    icon: "payments",
    color: "#2F8F63",
    light: "#E6F5EE",
    text: "#236B4A",
    accent: "#4EAB80",
    gradient: ["#236B4A", "#3AA070"],
  },
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

export default { colors, domainColors, domains, spacing, radius, fonts, type, shadow, bgGradient };
