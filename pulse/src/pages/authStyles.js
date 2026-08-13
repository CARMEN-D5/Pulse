// Styles shared by the four auth screens (Splash, Login, SignUp,
// ResetPassword). These are the React Native translation of the
// `.auth-redesign*` and `.welcome-*` class families from the old auth.css.
import { StyleSheet } from "react-native";

import { colors, radius, shadow, spacing, type } from "../theme";

export default StyleSheet.create({
  main: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.xxl,
    paddingVertical: spacing.xl,
  },

  header: { alignItems: "center", gap: spacing.lg },
  iconBox: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    ...shadow("md"),
  },
  title: { ...type.h1, fontSize: 28, letterSpacing: -0.3, color: colors.blOnSurface },
  subtitle: {
    ...type.bodyMedium,
    color: colors.blOnSurfaceVariant,
    textAlign: "center",
  },

  form: { gap: spacing.xl },

  forgotRow: { alignItems: "flex-end", paddingRight: spacing.xs, marginTop: -spacing.xs },

  // Circular social buttons (sign-in variant)
  socialCircles: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  socialCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },

  // Wide social buttons (sign-up variant)
  socialRow: { flexDirection: "row", gap: spacing.md },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(174, 180, 166, 0.2)",
    borderRadius: 14,
  },
  socialBtnText: { ...type.label, fontSize: 14, color: colors.blOnSurfaceVariant },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  footerText: { ...type.small, color: colors.blOnSurfaceVariant },
  footerLink: { ...type.label, color: colors.blPrimary },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  badgeText: { ...type.caption, color: colors.blOnSurfaceVariant },

  successBlock: { alignItems: "center", gap: spacing.md, paddingVertical: 20 },
  successText: { ...type.body, color: colors.blOnSurface, textAlign: "center" },
  successEmail: { fontFamily: type.label.fontFamily },

  pressed: { opacity: 0.7 },
});
