import { PropsWithChildren } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { theme } from "@/theme/tokens";

type ScreenProps = PropsWithChildren<{
  contentStyle?: object;
  scrollable?: boolean;
}>;

export function Screen({ children, contentStyle, scrollable = false }: ScreenProps) {
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.mesh}>
        <View style={[styles.orb, styles.orbTopLeft]} />
        <View style={[styles.orb, styles.orbTopRight]} />
        <View style={[styles.orb, styles.orbBottomLeft]} />
        <View style={[styles.orb, styles.orbBottomRight]} />
      </View>
      {scrollable ? (
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  mesh: {
    ...StyleSheet.absoluteFillObject
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.9
  },
  orbTopLeft: {
    backgroundColor: "rgba(156, 235, 232, 0.72)",
    height: 230,
    left: -48,
    top: -24,
    width: 220
  },
  orbTopRight: {
    backgroundColor: "rgba(255, 152, 205, 0.32)",
    height: 260,
    right: -80,
    top: -32,
    width: 260
  },
  orbBottomLeft: {
    backgroundColor: "rgba(214, 227, 255, 0.62)",
    bottom: 80,
    height: 220,
    left: -72,
    width: 220
  },
  orbBottomRight: {
    backgroundColor: "rgba(156, 235, 232, 0.24)",
    bottom: -80,
    height: 260,
    right: -72,
    width: 260
  },
  content: {
    flex: 1,
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: 120
  }
});
