// App chrome for the four root tabs — the persistent PULSE app bar and the
// bottom tab bar from the Sprint 4 UI refinement mockups.
//
// The shell owns the background gradient and the safe-area insets so the tab
// screens inside it are plain scroll views: they render with `gradient={false}`
// and `safeArea={false}` and never repeat the chrome themselves.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "./Icon";
import ScreenGradient from "./ScreenGradient";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { TUTORIAL_TARGETS, TutorialTarget } from "../tutorial";

/** The four root destinations, in the order the mockup lays them out. */
export const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "features", label: "Features", icon: "grid_view" },
  { id: "social", label: "Social", icon: "forum" },
  { id: "profile", label: "Profile", icon: "person" },
];

/** Wordmark + profile avatar. Pinned above the active tab screen. */
export function AppBar({ initials, onOpenProfile }) {
  return (
    <View style={styles.appBar}>
      <Text style={styles.wordmark} accessibilityRole="header">
        PULSE
      </Text>

      <Pressable
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        hitSlop={8}
        style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
      >
        {initials ? (
          <Text style={styles.avatarText}>{initials}</Text>
        ) : (
          <Icon name="person" size={22} color="#5b5a7a" />
        )}
      </Pressable>
    </View>
  );
}

/** Bottom navigation. The active item gets the lavender pill from the mockup. */
export function TabBar({ active, onChange }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
      accessibilityRole="tablist"
    >
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <TutorialTarget id={TUTORIAL_TARGETS.navigation[t.id]} key={t.id} style={styles.tabTarget}>
            <Pressable
              onPress={() => onChange(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t.label}
              style={({ pressed }) => [styles.tabItem, pressed && styles.pressed]}
            >
              <View style={[styles.tabIcon, selected && styles.tabIconActive]}>
                <Icon
                  name={t.icon}
                  size={20}
                  color={selected ? colors.pulsePrimaryDark : colors.textMuted}
                />
              </View>
              <Text style={[styles.tabLabel, selected && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          </TutorialTarget>
        );
      })}
    </View>
  );
}

/**
 * Frame around a root tab screen.
 *
 * `tab` is the active tab id, `onTabChange` receives the id that was tapped,
 * and `initials` seeds the app-bar avatar.
 */
export default function AppShell({ tab, onTabChange, initials, children }) {
  const insets = useSafeAreaInsets();

  return (
    <ScreenGradient>
      <View style={[styles.frame, { paddingTop: insets.top }]}>
        <AppBar initials={initials} onOpenProfile={() => onTabChange("profile")} />
        <View style={styles.body}>{children}</View>
        <TabBar active={tab} onChange={onTabChange} />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  body: { flex: 1 },
  pressed: { opacity: 0.7 },

  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 56,
    backgroundColor: colors.appBar,
  },
  wordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 1.5,
    color: colors.pulseAccent,
    // The mockup's wordmark is an outlined display face; the darker rose
    // shadow underneath is the closest stand-in with the app's own family.
    textShadowColor: colors.pulsePrimary,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoftStrong,
  },
  avatarText: { ...type.label, fontFamily: fonts.extrabold, fontSize: 15, color: "#5b5a7a" },

  tabBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    paddingTop: spacing.sm,
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow("md"),
  },
  tabItem: { width: "100%", alignItems: "center", gap: 2, paddingHorizontal: spacing.xs },
  tabTarget: { flex: 1, alignItems: "stretch" },
  tabIcon: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconActive: { backgroundColor: colors.accentSoftStrong },
  tabLabel: { ...type.caption, fontSize: 11, color: colors.textMuted },
  tabLabelActive: { fontFamily: fonts.bold, color: colors.pulsePrimaryDark },
});
