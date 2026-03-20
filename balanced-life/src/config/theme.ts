/**
 * Design system tokens for the BLNC app.
 * Use these throughout the app for consistent styling.
 */

export const COLORS = {
  // Primary
  primary: "#2E75B6",
  primaryLight: "#DBEAFE",
  primaryDark: "#1B2A4A",

  // Neutral
  background: "#FFFFFF",
  surface: "#F9FAFB",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Score colours
  scoreRed: "#EF4444",
  scoreOrange: "#F97316",
  scoreAmber: "#EAB308",
  scoreGreen: "#22C55E",
  scoreDeepGreen: "#16A34A",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZES = {
  caption: 12,
  body: 14,
  bodyLarge: 16,
  subtitle: 18,
  title: 20,
  heading: 24,
  display: 32,
  hero: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
