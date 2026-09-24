import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Icon from "../components/Icon";
import { Card, PrimaryButton, Screen } from "../components/ui";
import { DOMAINS } from "../data/quizData";
import { colors, domains, radius, spacing, type } from "../theme";

// quizData.js's domain ids intentionally don't match the canonical domain
// keys used elsewhere in the app (see theme.js's `domains`) — this table
// routes the mismatched ones to their canonical icon without touching the
// quiz's own ids.
const QUIZ_ID_TO_DOMAIN = {
  family_friends: "relationships",
  work_productivity: "productivity",
  financial: "finance",
};

const SCALE = [
  { value: 1, label: "Never" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "At times" },
  { value: 4, label: "Often" },
  { value: 5, label: "All the time" },
];

function getScaleLabel(val) {
  return SCALE.find((s) => s.value === val)?.label ?? "";
}

/**
 * All five domains are always asked. An earlier version let the user skip
 * health and spirituality at the APP 3.3 consent gate; that gate is now a
 * statement on the consent screen rather than a pair of switches, so there is
 * no filtered subset any more and this is back to the plain five.
 */
function EntryQuiz({ onComplete, loading = false }) {
  const [answers, setAnswers] = useState(
      Object.fromEntries(DOMAINS.map((d) => [d.id, null]))
  );

  const isComplete = DOMAINS.every((d) => answers[d.id] !== null);
  const answeredCount = DOMAINS.filter((d) => answers[d.id] !== null).length;

  function handleSelect(id, val) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    if (!isComplete || !onComplete) return;
    onComplete(DOMAINS.map((d) => ({ domain: d.id, score: answers[d.id] })));
  }

  return (
      <Screen contentContainerStyle={styles.screen}>
        <Card subtle style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logo}>Pulse</Text>
            </View>
            <Text style={styles.tagline}>How are you doing today?</Text>
          </View>

          {DOMAINS.map((d, i) => {
            const val = answers[d.id];
            const isLast = i === DOMAINS.length - 1;
            const domainKey = QUIZ_ID_TO_DOMAIN[d.id] ?? d.id;
            const domainMeta = domains[domainKey];
            const domainIcon = domainMeta?.icon ?? "star";
            const domainColor = domainMeta?.color ?? colors.pulsePrimary;

            return (
                <View key={d.id} style={[styles.domain, !isLast && styles.domainDivider]}>
                  <View style={styles.domainHead}>
                    <View style={styles.domainHeadText}>
                      <Text style={styles.domainName}>
                        <Icon name={domainIcon} size={15} color={domainColor} />{" "}
                        {d.name}
                      </Text>
                      <Text style={styles.domainFocus}>{d.focus}</Text>
                    </View>

                    <View
                        style={[
                          styles.valueBadge,
                          {
                            backgroundColor: val ? `${domainColor}22` : colors.pulseBg,
                            borderColor: val ? `${domainColor}55` : colors.border,
                          },
                        ]}
                    >
                      <Text
                          style={[styles.valueBadgeText, { color: val ? domainColor : colors.textMuted }]}
                          numberOfLines={1}
                      >
                        {val ? `${val} — ${getScaleLabel(val)}` : "Not set"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.question}>{d.questions[0]}</Text>

                  {/*
                The web build used <input type="range">. React Native has no
                core slider, and dragging a 5-stop scale on a phone is fiddly,
                so the same 1-5 value is chosen by tapping a segment instead.
                The data written back is identical.
              */}
                  <View
                      style={styles.scaleRow}
                      accessibilityRole="radiogroup"
                      accessibilityLabel={`${d.name} rating`}
                  >
                    {SCALE.map((s) => {
                      const selected = val === s.value;
                      return (
                          <Pressable
                              key={s.value}
                              onPress={() => handleSelect(d.id, s.value)}
                              accessibilityRole="radio"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`${s.value}, ${s.label}`}
                              style={({ pressed }) => [
                                styles.scaleItem,
                                selected && { backgroundColor: `${domainColor}1f`, borderColor: domainColor },
                                pressed && styles.pressed,
                              ]}
                          >
                            <Text
                                style={[
                                  styles.scaleValue,
                                  { color: selected ? domainColor : colors.textMuted },
                                ]}
                            >
                              {s.value}
                            </Text>
                            <Text
                                style={[
                                  styles.scaleLabel,
                                  selected && { color: domainColor, fontFamily: type.label.fontFamily },
                                ]}
                                numberOfLines={2}
                            >
                              {s.label}
                            </Text>
                          </Pressable>
                      );
                    })}
                  </View>
                </View>
            );
          })}

          <PrimaryButton
              label={
                isComplete
                    ? "Submit check-in"
                    : `Answer all questions to continue (${answeredCount}/${DOMAINS.length})`
              }
              onPress={handleSubmit}
              disabled={!isComplete}
              loading={loading}
              style={styles.submit}
          />
        </Card>
      </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingVertical: spacing.xl },
  card: {
    maxWidth: 520,
    alignSelf: "center",
  },

  brand: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.pulsePrimary,
  },
  logo: { ...type.h2, color: colors.pulsePrimaryDark },
  tagline: { ...type.small, color: colors.textMuted },

  domain: { paddingVertical: 18 },
  domainDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },

  domainHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  domainHeadText: { flex: 1 },
  domainName: { ...type.label, color: colors.text },
  domainFocus: { ...type.caption, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  valueBadge: {
    flexShrink: 0,
    marginLeft: spacing.md,
    minWidth: 100,
    paddingVertical: spacing.xs,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  valueBadgeText: { ...type.caption, textAlign: "center" },

  question: { ...type.bodyMedium, fontFamily: type.label.fontFamily, color: colors.text, marginBottom: 14 },

  scaleRow: { flexDirection: "row", gap: 6 },
  scaleItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.5)",
    gap: 2,
  },
  scaleValue: { ...type.label, fontSize: 15 },
  scaleLabel: { ...type.caption, fontSize: 10, color: colors.textMuted, textAlign: "center" },
  pressed: { opacity: 0.7 },

  submit: { marginTop: spacing.lg },
});

export default EntryQuiz;
