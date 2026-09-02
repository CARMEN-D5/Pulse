import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, PrimaryButton, Screen } from "../components/ui";
import { DOMAINS } from "../data/quizData";
import { colors, radius, spacing, type } from "../theme";

const SCALE = [
  { value: 1, label: "Never" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "At times" },
  { value: 4, label: "Often" },
  { value: 5, label: "All the time" },
];

function getScaleColor(val) {
  if (!val) return colors.border;
  if (val === 1) return "#d64545";
  if (val === 2) return "#e08a3c";
  if (val === 3) return "#e0c23c";
  if (val === 4) return "#5aac6e";
  return "#3A8F70";
}

function getScaleLabel(val) {
  return SCALE.find((s) => s.value === val)?.label ?? "";
}

function EntryQuiz({ onComplete, loading = false, excludeDomains = [] }) {
  const domains = DOMAINS.filter((d) => !excludeDomains.includes(d.id));

  // Keyed on the FULL domain list on purpose. `excludeDomains` can change
  // while this screen is mounted — the consent modal opens over the quiz, so
  // answering it re-renders us with a different filter. A useState initialiser
  // only runs once, so seeding this from `domains` would leave the newly
  // included domains with no key at all, and `answers[id] !== null` is true
  // for `undefined` — the quiz would report itself complete with nothing
  // answered and submit undefined scores.
  const [answers, setAnswers] = useState(
      Object.fromEntries(DOMAINS.map((d) => [d.id, null]))
  );

  // If a domain becomes excluded after the user has already rated it, drop the
  // rating rather than leaving it sitting in state. It would not be submitted
  // either way, but not holding it at all is the better default.
  useEffect(() => {
    if (!excludeDomains.length) return;
    setAnswers((prev) => {
      const stale = excludeDomains.filter((id) => prev[id] !== null && prev[id] !== undefined);
      if (!stale.length) return prev;
      const next = { ...prev };
      for (const id of stale) next[id] = null;
      return next;
    });
  }, [excludeDomains.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const isComplete = domains.every((d) => answers[d.id] !== null && answers[d.id] !== undefined);
  const answeredCount = domains.filter(
      (d) => answers[d.id] !== null && answers[d.id] !== undefined
  ).length;

  function handleSelect(id, val) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function handleSubmit() {
    if (!isComplete || !onComplete) return;
    onComplete(domains.map((d) => ({ domain: d.id, score: answers[d.id] })));
  }

  return (
      <Screen contentContainerStyle={styles.screen}>
        <Card style={styles.card}>
          <View style={styles.brand}>
            <View style={styles.brandRow}>
              <View style={styles.logoDot} />
              <Text style={styles.logo}>Pulse</Text>
            </View>
            <Text style={styles.tagline}>How are you doing today?</Text>
          </View>

          {domains.map((d, i) => {
            const val = answers[d.id];
            const color = getScaleColor(val);
            const isLast = i === domains.length - 1;

            return (
                <View key={d.id} style={[styles.domain, !isLast && styles.domainDivider]}>
                  <View style={styles.domainHead}>
                    <View style={styles.domainHeadText}>
                      <Text style={styles.domainName}>
                        {d.icon ? `${d.icon} ` : ""}
                        {d.name}
                      </Text>
                      <Text style={styles.domainFocus}>{d.focus}</Text>
                    </View>

                    <View
                        style={[
                          styles.valueBadge,
                          {
                            backgroundColor: val ? `${color}22` : colors.pulseBg,
                            borderColor: val ? `${color}55` : colors.border,
                          },
                        ]}
                    >
                      <Text
                          style={[styles.valueBadgeText, { color: val ? color : colors.textMuted }]}
                          numberOfLines={1}
                      >
                        {val ? `${val} — ${getScaleLabel(val)}` : "Not set"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.question}>{d.questions[0]}</Text>
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
                                selected && { backgroundColor: `${color}1f`, borderColor: color },
                                pressed && styles.pressed,
                              ]}
                          >
                            <Text
                                style={[
                                  styles.scaleValue,
                                  { color: selected ? color : colors.textMuted },
                                ]}
                            >
                              {s.value}
                            </Text>
                            <Text
                                style={[
                                  styles.scaleLabel,
                                  selected && { color, fontFamily: type.label.fontFamily },
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
                    : `Answer all questions to continue (${answeredCount}/${domains.length})`
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
  card: { maxWidth: 520, alignSelf: "center" },

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