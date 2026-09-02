import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Alert, PrimaryButton, Screen, ScreenHeader } from "../components/ui";
import { logAction, logReflection } from "../firestore/scoring";
import { DOMAINS } from "../scoring/scoringEngine";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from "../tutorial";

const RATING_LABELS = ["", "Poor", "Fair", "Okay", "Good", "Great"];

function RatingPicker({ value, onChange }) {
  return (
    <View style={styles.ratingPicker} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${n} – ${RATING_LABELS[n]}`}
            style={({ pressed }) => [
              styles.ratingBtn,
              active && styles.ratingBtnActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.ratingNum, active && styles.ratingTextActive]}>{n}</Text>
            <Text style={[styles.ratingLabel, active && styles.ratingTextActive]}>
              {RATING_LABELS[n]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DomainPage({ domainKey, domainScore, user, onBack, onActivityLogged }) {
  const domain = DOMAINS[domainKey];

  const [rating, setRating] = useState(0);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);
  const [actionsDone, setActionsDone] = useState([]);

  const [error, setError] = useState(null);
  useTutorial("relationships", { enabled: domainKey === "relationships" });

  const handleLogReflection = async () => {
    setReflectionLoading(true);
    setError(null);
    const result = await logReflection(user.uid, domainKey, rating);
    if (result.ok) {
      setReflectionDone(true);
      onActivityLogged?.();
    } else {
      setError(result.error);
    }
    setReflectionLoading(false);
  };

  const handleLogAction = async (actionType) => {
    setActionLoading(actionType);
    setError(null);
    const result = await logAction(user.uid, domainKey, actionType);
    if (result.ok) {
      setActionsDone((prev) => [...prev, actionType]);
      onActivityLogged?.();
    } else {
      setError(result.error);
    }
    setActionLoading(null);
  };

  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScreenHeader title={domain.label} onBack={onBack} />

      {/* Domain identity */}
      <View style={styles.titleRow}>
        <Text style={styles.domainIcon}>{domain.icon}</Text>
        <View style={styles.flex}>
          <Text style={styles.domainName}>{domain.label}</Text>
          {domainScore != null ? (
            <Text style={styles.domainScore}>
              Current score:{" "}
              <Text style={styles.domainScoreValue}>{Math.round(domainScore)}</Text> / 100
            </Text>
          ) : null}
        </View>
      </View>

      <Alert message={error} />

      {/* Reflection section */}
      <TutorialTarget id={TUTORIAL_TARGETS.domain.reflection}>
      <View style={[styles.section, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Daily Check-in</Text>
        <Text style={styles.sectionPrompt}>{domain.reflectionPrompt}</Text>

        {reflectionDone ? (
          <Alert
            tone="success"
            message="Check-in logged! Your reflection score has been updated."
          />
        ) : (
          <>
            <RatingPicker value={rating} onChange={setRating} />
            <PrimaryButton
              label={reflectionLoading ? "Saving…" : "Log check-in"}
              onPress={handleLogReflection}
              disabled={rating === 0}
              loading={reflectionLoading}
              style={styles.sectionCta}
            />
          </>
        )}
      </View>
      </TutorialTarget>

      {/* Actions section */}
      <TutorialTarget id={TUTORIAL_TARGETS.domain.actions}>
      <View style={[styles.section, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Log an Action</Text>
        <Text style={styles.sectionSub}>
          Each action earns points toward your weekly action score.
        </Text>

        <View style={styles.actionList}>
          {Object.entries(domain.actions).map(([actionType, action]) => {
            const done = actionsDone.includes(actionType);
            return (
              <Pressable
                key={actionType}
                onPress={() => handleLogAction(actionType)}
                disabled={actionLoading === actionType}
                accessibilityRole="button"
                accessibilityState={{ disabled: actionLoading === actionType }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  done && styles.actionBtnDone,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={[styles.actionPoints, done && styles.actionPointsDone]}>
                  {done ? "✓ logged" : `+${action.points} pts`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      </TutorialTarget>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: 40 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  domainIcon: { fontSize: 34 },
  domainName: { ...type.h2, color: colors.text },
  domainScore: { ...type.small, color: colors.textMuted },
  domainScoreValue: { fontFamily: fonts.bold, color: colors.text },

  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...type.title, fontFamily: fonts.bold, color: colors.text },
  sectionPrompt: { ...type.body, color: colors.text },
  sectionSub: { ...type.small, color: colors.textMuted },
  sectionCta: { marginTop: spacing.xs },

  ratingPicker: { flexDirection: "row", gap: 6 },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pulseBg,
    gap: 2,
  },
  ratingBtnActive: { backgroundColor: colors.pulsePrimary, borderColor: colors.pulsePrimary },
  ratingNum: { ...type.label, fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ratingLabel: { ...type.caption, fontSize: 10, color: colors.textMuted },
  ratingTextActive: { color: "#fff" },

  actionList: { gap: spacing.sm },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pulseBg,
  },
  actionBtnDone: {
    backgroundColor: "rgba(47, 158, 122, 0.10)",
    borderColor: "rgba(47, 158, 122, 0.35)",
  },
  actionLabel: { ...type.bodyMedium, flex: 1, color: colors.text },
  actionPoints: { ...type.label, fontSize: 12, color: colors.pulsePrimaryDark },
  actionPointsDone: { color: colors.success },
});

export default DomainPage;
