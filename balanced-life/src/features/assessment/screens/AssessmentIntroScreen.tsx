import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../../../shared/types/navigation.types";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS, DOMAIN_IDS } from "../../../config/domains";

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "AssessmentIntro">;

export function AssessmentIntroScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Let's Get to Know You</Text>
      <Text style={styles.subtitle}>
        Answer 25 quick questions across 5 life areas. This helps us calculate
        your personalised Balance Score.
      </Text>

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📋</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>25 Questions</Text>
            <Text style={styles.infoDesc}>5 questions per life domain</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏱️</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>About 3 Minutes</Text>
            <Text style={styles.infoDesc}>Quick and easy to complete</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🎯</Text>
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Your Balance Score</Text>
            <Text style={styles.infoDesc}>See how balanced your life is right now</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Life Domains</Text>
      <View style={styles.domainList}>
        {DOMAIN_IDS.map((id) => {
          const domain = DOMAINS[id];
          return (
            <View key={id} style={styles.domainRow}>
              <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
              <Text style={styles.domainLabel}>{domain.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.honesty}>
        Answer honestly — there are no right or wrong answers. Your responses
        are private and only used to personalise your experience.
      </Text>

      <Button
        title="Start Assessment"
        onPress={() => navigation.navigate("AssessmentQuiz")}
        style={styles.startButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  infoCard: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  infoDesc: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  domainList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  domainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  domainLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  honesty: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  startButton: {
    marginBottom: SPACING.xxl,
  },
});
