/**
 * WelcomeScreen — First screen users see. Brand intro + CTA buttons.
 */
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { AuthStackParamList } from "../../shared/types/navigation.types";
import { Button } from "../../shared/components";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";

type WelcomeNav = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export function WelcomeScreen() {
  const navigation = useNavigation<WelcomeNav>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroSection}>
        {/* TODO: Replace with actual logo/illustration */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>BLNC</Text>
        </View>
        <Text style={styles.title}>Balanced Life</Text>
        <Text style={styles.subtitle}>
          Track, balance, and improve the 5 key areas of your life
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureItem emoji="🧠" text="Mental & Spiritual Wellbeing" />
        <FeatureItem emoji="💪" text="Physical Health" />
        <FeatureItem emoji="💰" text="Financial Habits" />
        <FeatureItem emoji="👥" text="Social Connection" />
        <FeatureItem emoji="🎯" text="Productivity & Goals" />
      </View>

      <View style={styles.buttonSection}>
        <Button
          title="Get Started"
          onPress={() => navigation.navigate("Register")}
        />
        <Button
          title="I Already Have an Account"
          onPress={() => navigation.navigate("Login")}
          variant="ghost"
          style={styles.loginButton}
        />
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  heroSection: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  logoText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  title: {
    fontSize: FONT_SIZES.display,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  features: {
    flex: 1,
    justifyContent: "center",
    gap: SPACING.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  featureEmoji: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  buttonSection: {
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  loginButton: {
    marginTop: SPACING.xs,
  },
});
