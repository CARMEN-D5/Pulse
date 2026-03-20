import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { RootStackParamList } from "../../../shared/types/navigation.types";
import { Button } from "../../../shared/components/Button";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS, DOMAIN_IDS, DomainId } from "../../../config/domains";
import { CHECK_IN_OPTIONS, CheckInValue } from "../constants/checkInOptions";
import { CheckInAnswers, hasCheckedInToday, saveCheckIn } from "../services/checkInService";
import { useAuthStore } from "../../auth/stores/authStore";

type Nav = NativeStackNavigationProp<RootStackParamList, "CheckIn">;

export function CheckInScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<DomainId, CheckInValue>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const domainId = DOMAIN_IDS[currentIndex];
  const domain = DOMAINS[domainId];
  const selectedValue = answers[domainId];
  const isLastQuestion = currentIndex === DOMAIN_IDS.length - 1;
  const progress = (currentIndex + 1) / DOMAIN_IDS.length;

  useEffect(() => {
    if (!user) return;
    hasCheckedInToday(user.uid).then((checked) => {
      if (checked) setAlreadyCheckedIn(true);
    });
  }, [user]);

  function animateTransition(callback: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 100);
  }

  function selectAnswer(value: CheckInValue) {
    setAnswers((prev) => ({ ...prev, [domainId]: value }));
  }

  function goNext() {
    if (selectedValue == null) return;
    if (isLastQuestion) {
      handleSubmit();
    } else {
      animateTransition(() => setCurrentIndex((i) => i + 1));
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      animateTransition(() => setCurrentIndex((i) => i - 1));
    } else {
      navigation.goBack();
    }
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < DOMAIN_IDS.length) {
      Alert.alert("Incomplete", "Please answer all questions.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveCheckIn(user!.uid, answers as CheckInAnswers);
      navigation.navigate("CheckInResult", { result } as any);
    } catch (error) {
      Alert.alert("Error", "Failed to save check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadyCheckedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.alreadyDone}>
          <Text style={styles.alreadyDoneEmoji}>✅</Text>
          <Text style={styles.alreadyDoneTitle}>Already Checked In</Text>
          <Text style={styles.alreadyDoneText}>
            You've already completed your check-in for today. Come back tomorrow!
          </Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: SPACING.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Check-In</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: domain.color }]} />
      </View>

      {/* Question */}
      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        {/* Domain badge */}
        <View style={[styles.domainBadge, { backgroundColor: domain.lightColor }]}>
          <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
          <Text style={[styles.domainLabel, { color: domain.color }]}>{domain.label}</Text>
        </View>

        <Text style={styles.questionText}>{domain.checkInQuestion}</Text>

        {/* Answer options — 5 compact buttons */}
        <View style={styles.optionsRow}>
          {CHECK_IN_OPTIONS.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  isSelected && {
                    borderColor: domain.color,
                    backgroundColor: domain.lightColor,
                  },
                ]}
                onPress={() => selectAnswer(option.value as CheckInValue)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && { color: domain.color, fontWeight: "700" },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navButtons}>
        <Button
          title="Back"
          variant="outline"
          onPress={goBack}
          style={styles.navButton}
        />
        <Button
          title={isLastQuestion ? "Submit" : "Next"}
          onPress={goNext}
          disabled={selectedValue == null}
          loading={isSubmitting}
          style={styles.navButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  closeButton: {
    fontSize: 22,
    color: COLORS.textMuted,
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  domainLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
  },
  questionText: {
    fontSize: FONT_SIZES.title,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: SPACING.xl,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    justifyContent: "center",
  },
  optionButton: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 62,
    gap: 4,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  navButtons: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  navButton: {
    flex: 1,
  },
  alreadyDone: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  alreadyDoneEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  alreadyDoneTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  alreadyDoneText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
