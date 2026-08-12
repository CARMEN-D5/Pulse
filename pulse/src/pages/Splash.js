import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Icon from "../components/Icon";
import { LinkButton, PrimaryButton, Screen } from "../components/ui";
import { colors, radius, shadow, spacing, type } from "../theme";

// The five life domains Pulse tracks, shown as a row of hints at the bottom.
const DOMAIN_HINTS = [
  { icon: "favorite", label: "Health" },
  { icon: "psychology", label: "Mind" },
  { icon: "self_improvement", label: "Spirit" },
  { icon: "groups", label: "Social" },
  { icon: "work", label: "Work" },
];

function Splash({ onLogin, onSignUp }) {
  return (
    <Screen contentContainerStyle={styles.screen} keyboardAvoiding={false}>
      {/* Brand bar. The web version pinned this to the viewport; on a phone it
          just sits at the top of the scroll content. */}
      <View style={styles.brand}>
        <Icon name="spa" size={24} color={colors.blPrimary} />
        <Text style={styles.brandName}>Pulse</Text>
      </View>

      <View style={styles.main}>
        {/* Hero visual */}
        <View style={styles.heroWrap}>
          <View style={styles.heroCard}>
            <Icon name="self_improvement" size={96} color={colors.blPrimary} />
            <View style={styles.heroSubIcons}>
              <Icon name="favorite" size={26} color={colors.blOnSurfaceVariant} />
              <Icon name="psychology" size={26} color={colors.blOnSurfaceVariant} />
              <Icon name="groups" size={26} color={colors.blOnSurfaceVariant} />
              <Icon name="work" size={26} color={colors.blOnSurfaceVariant} />
            </View>
          </View>

          {/* Floating reflection card */}
          <View style={styles.reflectCard}>
            <View style={styles.reflectHeader}>
              <Icon name="lightbulb" size={16} color={colors.blTertiary} />
              <Text style={styles.reflectLabel}>Reflection</Text>
            </View>
            <Text style={styles.reflectText}>
              What part of your life needs the most care today?
            </Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>
            Find Your Perfect <Text style={styles.titleAccent}>Balance</Text>
          </Text>
          <Text style={styles.subtitle}>
            Discover a more intentional way to live across all domains of your life: Health,
            Mind, Spirit, Social, and Work.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="Start My Journey"
            icon="arrow_forward"
            onPress={onSignUp}
            style={styles.cta}
          />
          <LinkButton label="I already have an account" onPress={onLogin} />
        </View>
      </View>

      {/* Domain indicators */}
      <View style={styles.domains}>
        {DOMAIN_HINTS.map((d) => (
          <View key={d.label} style={styles.domainItem}>
            <Icon name={d.icon} size={20} color={colors.blOnSurfaceVariant} />
            <Text style={styles.domainLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },

  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandName: { ...type.h3, letterSpacing: -0.3, color: colors.blPrimaryDim },

  main: { width: "100%", maxWidth: 420, alignItems: "center", gap: spacing.xxxl },

  // The hero is a square glass tile with a small card overlapping its
  // bottom-right corner. Extra bottom/right padding on the wrapper gives that
  // overlap room, since React Native will not paint outside the parent bounds
  // in the same way absolute positioning did on the web.
  heroWrap: { paddingRight: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    width: 280,
    height: 280,
    maxWidth: "100%",
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(156, 235, 232, 0.28)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow("lg"),
  },
  heroSubIcons: { flexDirection: "row", gap: spacing.lg, opacity: 0.5 },

  reflectCard: {
    position: "absolute",
    bottom: 0,
    right: 0,
    maxWidth: 190,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow("md"),
  },
  reflectHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  reflectLabel: { ...type.caption, color: colors.blTertiary },
  reflectText: { ...type.small, fontSize: 12, color: colors.blOnSurface },

  content: { alignItems: "center", gap: spacing.md },
  title: { ...type.h1, textAlign: "center", color: colors.blOnSurface },
  titleAccent: { color: colors.blPrimary },
  subtitle: {
    ...type.body,
    textAlign: "center",
    color: colors.blOnSurfaceVariant,
  },

  actions: { width: "100%", gap: spacing.lg },
  cta: { borderRadius: radius.pill },

  domains: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xl },
  domainItem: { alignItems: "center", gap: spacing.xs, opacity: 0.7 },
  domainLabel: { ...type.caption, color: colors.blOnSurfaceVariant },
});

export default Splash;
