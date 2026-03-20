import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../../../shared/types/navigation.types";
import { Button } from "../../../shared/components/Button";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DOMAINS } from "../../../config/domains";
import {
  ASSESSMENT_QUESTIONS,
  ANSWER_OPTIONS,
  TOTAL_QUESTIONS,
} from "../constants/questions";
import { calculateAssessmentScores, saveAssessmentResults } from "../services/assessmentService";
import { useAuthStore } from "../../auth/stores/authStore";

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "AssessmentQuiz">;

export function AssessmentQuizScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const question = ASSESSMENT_QUESTIONS[currentIndex];
  const domain = DOMAINS[question.domain];
  const progress = (currentIndex + 1) / TOTAL_QUESTIONS;
  const selectedValue = answers[question.id];
  const isLastQuestion = currentIndex === TOTAL_QUESTIONS - 1;
  const answeredCount = Object.keys(answers).length;

  function animateTransition(callback: () => void) {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(callback, 120);
  }

  function selectAnswer(value: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function goNext() {
    if (!selectedValue) return;
    if (isLastQuestion) {
      handleSubmit();
    } else {
      animateTransition(() => setCurrentIndex((i) => i + 1));
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      animateTransition(() => setCurrentIndex((i) => i - 1));
    }
  }

  async function handleSubmit() {
    if (answeredCount < TOTAL_QUESTIONS) {
      Alert.alert("Incomplete", "Please answer all questions before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = calculateAssessmentScores(answers);
      await saveAssessmentResults(user!.uid, answers, result);
      navigation.navigate("ScoreReveal", { result });
    } catch (error) {
      Alert.alert("Error", "Failed to save your assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: domain.color }]} />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} of {TOTAL_QUESTIONS}
        </Text>
      </View>

      {/* Domain badge */}
      <View style={[styles.domainBadge, { backgroundColor: domain.lightColor }]}>
        <View style={[styles.domainDot, { backgroundColor: domain.color }]} />
        <Text style={[styles.domainLabel, { color: domain.color }]}>{domain.label}</Text>
      </View>

      {/* Question */}
      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.questionText}>{question.text}</Text>

        {/* Answer options */}
        <View style={styles.optionsList}>
          {ANSWER_OPTIONS.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  isSelected && { borderColor: domain.color, backgroundColor: domain.lightColor },
                ]}
                onPress={() => selectAnswer(option.value)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.radio,
                  isSelected && { borderColor: domain.color },
                ]}>
                  {isSelected && (
                    <View style={[styles.radioInner, { backgroundColor: domain.color }]} />
                  )}
                </View>
                <Text style={[
                  styles.optionLabel,
                  isSelected && { color: domain.color, fontWeight: "600" },
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        <Button
          title="Back"
          variant="outline"
          onPress={goBack}
          disabled={currentIndex === 0}
          style={styles.navButton}
        />
        <Button
          title={isLastQuestion ? "See My Score" : "Next"}
          onPress={goNext}
          disabled={!selectedValue}
          loading={isSubmitting}
          style={styles.navButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  progressContainer: {
    marginBottom: SPACING.lg,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: "right",
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
  questionContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: FONT_SIZES.title,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: SPACING.xl,
  },
  optionsList: {
    gap: SPACING.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionLabel: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textPrimary,
  },
  navButtons: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingTop: SPACING.lg,
  },
  navButton: {
    flex: 1,
  },
});
