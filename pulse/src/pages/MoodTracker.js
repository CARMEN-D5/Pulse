import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { PrimaryButton, Screen, ScreenHeader } from "../components/ui";
import {
  buildWeekData,
  getTimeOfDay,
  JOURNAL_PROMPTS,
  MOOD_EMOTIONS,
  MOODS,
  todayKey,
} from "../data/spirituality";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";

// ---------------------------------------------------------------------------
// MoodFace — soft filled circle, dot eyes, curved mouth. No eyebrows.
// Always rendered filled with the mood colour; feature colour is white when
// selected (solid fill) or the mood colour when unselected (light fill).
// ---------------------------------------------------------------------------

// Mouth paths per mood id, drawn on a 48×48 viewBox centred at (24,24).
const MOUTHS = {
  1: "M 15 30 Q 24 24 33 30", // frown
  2: "M 16 29 Q 24 26 32 29", // slight frown
  3: "M 16 28 L 32 28",       // flat
  4: "M 15 27 Q 24 33 33 27", // slight smile
  5: "M 14 26 Q 24 35 34 26", // big smile
};

export function MoodFace({ moodId, size = 48, selected = false }) {
  const m = MOODS.find((x) => x.id === moodId) || MOODS[2];

  // Unselected: light bg fill + coloured border + coloured features.
  // Selected: solid colour fill + no border + white features.
  const circleFill = selected ? m.color : m.bg;
  const circleStroke = selected ? "none" : m.color;
  const featureColor = selected ? "rgba(255,255,255,0.92)" : m.color;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Face circle */}
      <Circle cx="24" cy="24" r="22" fill={circleFill} stroke={circleStroke} strokeWidth="1.8" />

      {/* Eyes */}
      <Circle cx={24 - 8.4} cy={24 - 3.8} r="2.6" fill={featureColor} />
      <Circle cx={24 + 8.4} cy={24 - 3.8} r="2.6" fill={featureColor} />

      {/* Mouth */}
      <Path
        d={MOUTHS[moodId] || MOUTHS[3]}
        stroke={featureColor}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// MoodCheckInOverlay — step 1: pick a mood
// ---------------------------------------------------------------------------

export function MoodCheckInOverlay({ onSelect, onSkip }) {
  const [selected, setSelected] = useState(null);
  const m = selected ? MOODS.find((x) => x.id === selected) : null;

  return (
    <Screen contentContainerStyle={styles.screen} keyboardAvoiding={false}>
      <ScreenHeader title="Spirituality" subtitle="Daily check-in" onBack={onSkip} />

      <View style={[styles.card, styles.checkinCard, shadow("sm")]}>
        <Text style={styles.eyebrow}>Good {getTimeOfDay()}! How are you feeling?</Text>
        <Text style={styles.checkinHeading}>{selected ? m.label : "Select a mood"}</Text>

        <View
          style={[
            styles.faceRing,
            {
              backgroundColor: m ? m.bg : "#faf7f9",
              borderColor: m ? `${m.color}55` : colors.border,
            },
          ]}
        >
          <MoodFace moodId={selected || 3} size={90} selected={Boolean(selected)} />
        </View>

        <View style={styles.moodRow}>
          {MOODS.map((mood) => {
            const isSelected = selected === mood.id;
            return (
              <Pressable
                key={mood.id}
                onPress={() => setSelected(mood.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={mood.label}
                style={[styles.moodBtn, isSelected && styles.moodBtnSelected]}
              >
                <MoodFace moodId={mood.id} size={44} selected={isSelected} />
                <Text
                  style={[
                    styles.moodBtnLabel,
                    isSelected && { color: mood.textColor, fontFamily: fonts.semibold },
                  ]}
                >
                  {mood.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PrimaryButton
        label="Continue →"
        onPress={() => selected && onSelect(selected)}
        disabled={!selected}
        style={selected ? { backgroundColor: m.color } : undefined}
      />
      <Pressable
        onPress={onSkip}
        accessibilityRole="button"
        style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
      >
        <Text style={styles.ghostBtnText}>Skip for now</Text>
      </Pressable>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// JournalPromptOverlay — write a journal entry
// ---------------------------------------------------------------------------

export function JournalPromptOverlay({ moodId, onSave, onSkip }) {
  const [text, setText] = useState("");
  const [emotions, setEmotions] = useState([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const m = MOODS.find((x) => x.id === moodId);
  const prompt = JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length];
  const emotionOptions = MOOD_EMOTIONS[moodId] || [];

  useEffect(() => {
    // Small delay so the screen transition finishes before the keyboard opens;
    // focusing immediately on Android can drop the first keystrokes.
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const toggleEmotion = (tag) => {
    setEmotions((prev) => (prev.includes(tag) ? prev.filter((e) => e !== tag) : [...prev, tag]));
  };

  const hasContent = Boolean(text.trim() || emotions.length > 0);

  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScreenHeader title="Journal" onBack={onSkip} />

      <View style={[styles.card, shadow("sm")]}>
        {/* Mood badge */}
        <View style={[styles.moodBadge, { backgroundColor: m.bg, borderColor: `${m.color}33` }]}>
          <MoodFace moodId={moodId} size={32} selected />
          <Text style={[styles.moodBadgeText, { color: m.textColor }]}>
            Feeling {m.label.toLowerCase()} today
          </Text>
        </View>

        {/* Prompt */}
        <View style={[styles.promptRule, { borderLeftColor: m.color }]}>
          <Text style={styles.promptText}>"{prompt}"</Text>
        </View>

        {/* Text area */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Write freely — this is just for you…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.textarea, focused && { borderColor: m.color }]}
        />

        {/* Emotion tags */}
        <View>
          <Text style={styles.eyebrow}>What are you feeling?</Text>
          <View style={styles.tagWrap}>
            {emotionOptions.map((tag) => {
              const active = emotions.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleEmotion(tag)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  style={({ pressed }) => [
                    styles.tag,
                    {
                      borderColor: active ? m.color : colors.border,
                      backgroundColor: active ? m.bg : "transparent",
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      active && { color: m.textColor, fontFamily: fonts.semibold },
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.journalActions}>
          <PrimaryButton
            label={hasContent ? "Save & continue →" : "Continue without writing →"}
            onPress={() => onSave(text.trim(), emotions)}
            style={hasContent ? { backgroundColor: m.color } : undefined}
          />
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ghostBtnText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// WeekMoodChart — SVG chart of the last 7 days
// ---------------------------------------------------------------------------

const CHART_W = 300, CHART_H = 90, PAD_X = 18, PAD_Y = 12;

export function WeekMoodChart({ weekData }) {
  const entries = weekData.filter((d) => d.moodId != null);

  const colW = CHART_W / 7;
  const yScale = (id) => PAD_Y + ((5 - id) / 4) * (CHART_H - PAD_Y * 2);

  const points = weekData.map((d, i) =>
    d.moodId != null
      ? { x: colW * i + colW / 2, y: yScale(d.moodId), moodId: d.moodId, key: d.key }
      : null
  );

  const lineSegs = [];
  let seg = [];
  for (const p of points) {
    if (p) {
      seg.push(p);
    } else if (seg.length > 0) {
      lineSegs.push(seg);
      seg = [];
    }
  }
  if (seg.length > 0) lineSegs.push(seg);

  function cubicPath(pts) {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
      d += ` C ${cp} ${pts[i - 1].y}, ${cp} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }

  if (entries.length === 0) {
    return <Text style={styles.chartEmpty}>No mood data this week yet</Text>;
  }

  return (
    <Svg width="100%" height={CHART_H + 28} viewBox={`0 0 ${CHART_W} ${CHART_H + 28}`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <Line
          key={v}
          x1={PAD_X}
          x2={CHART_W - PAD_X}
          y1={yScale(v)}
          y2={yScale(v)}
          stroke={colors.border}
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
      ))}

      {lineSegs.map((s, si) =>
        s.length > 1 ? (
          <Path
            key={si}
            d={cubicPath(s)}
            fill="none"
            stroke={colors.border}
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : null
      )}

      {points.map((p, i) => {
        if (!p) {
          return (
            <Circle
              key={weekData[i].key}
              cx={colW * i + colW / 2}
              cy={CHART_H / 2}
              r="5"
              fill="none"
              stroke={colors.border}
              strokeWidth="1"
            />
          );
        }
        const m = MOODS.find((x) => x.id === p.moodId);
        return (
          <G key={p.key}>
            <Circle cx={p.x} cy={p.y} r="13" fill={m.bg} stroke={m.color} strokeWidth="1.5" />
            <Circle cx={p.x - 4} cy={p.y - 1} r="1.5" fill={m.color} />
            <Circle cx={p.x + 4} cy={p.y - 1} r="1.5" fill={m.color} />
            {p.moodId >= 4 ? (
              <Path
                d={`M ${p.x - 4} ${p.y + 4} Q ${p.x} ${p.y + 7} ${p.x + 4} ${p.y + 4}`}
                stroke={m.color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : p.moodId === 3 ? (
              <Line
                x1={p.x - 4}
                y1={p.y + 5}
                x2={p.x + 4}
                y2={p.y + 5}
                stroke={m.color}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ) : (
              <Path
                d={`M ${p.x - 4} ${p.y + 6} Q ${p.x} ${p.y + 3} ${p.x + 4} ${p.y + 6}`}
                stroke={m.color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            )}
          </G>
        );
      })}

      {weekData.map((d, i) => (
        <SvgText
          key={d.key}
          x={colW * i + colW / 2}
          y={CHART_H + 20}
          textAnchor="middle"
          fontSize="10"
          fontFamily={d.isToday ? fonts.bold : fonts.regular}
          fill={d.isToday ? colors.text : colors.textMuted}
        >
          {d.dayLabel}
        </SvgText>
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// MoodDashboard — main view
// ---------------------------------------------------------------------------

export function MoodDashboard({ uid, moodData, onLogNewMood, onBack }) {
  const weekData = useMemo(() => buildWeekData(moodData), [moodData]);
  const todayData = useMemo(() => moodData[todayKey()] || null, [moodData]);
  const todayMood = todayData ? MOODS.find((x) => x.id === todayData.moodId) : null;

  const dateStr = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const recentJournals = useMemo(() => {
    return Object.entries(moodData)
      .filter(([, v]) => v.journalText)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 4)
      .map(([k, v]) => {
        const d = new Date(`${k}T12:00:00`);
        return {
          key: k,
          dateLabel: d.toLocaleDateString("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          moodId: v.moodId,
          text: v.journalText,
          emotions: v.emotions || [],
        };
      });
  }, [moodData]);

  return (
    <Screen contentContainerStyle={styles.screen} keyboardAvoiding={false}>
      <ScreenHeader title="Spirituality" subtitle={dateStr} onBack={onBack} />

      {/* Today card */}
      <View
        style={[
          styles.card,
          shadow("sm"),
          todayMood && { backgroundColor: todayMood.bg, borderColor: `${todayMood.color}33` },
        ]}
      >
        <View style={styles.todayHead}>
          <Text style={[styles.sectionTitle, todayMood && { color: todayMood.textColor }]}>
            Today's mood
          </Text>
          {todayMood ? (
            <Pressable
              onPress={onLogNewMood}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.updateBtn,
                { borderColor: `${todayMood.color}66` },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.updateBtnText, { color: todayMood.textColor }]}>Update</Text>
            </Pressable>
          ) : null}
        </View>

        {todayMood ? (
          <View style={styles.todayRow}>
            <MoodFace moodId={todayData.moodId} size={52} selected />
            <View style={styles.flex}>
              <Text style={[styles.todayLabel, { color: todayMood.textColor }]}>
                {todayMood.label}
              </Text>
              {todayData.journalText ? (
                <Text
                  style={[styles.todayJournal, { color: todayMood.textColor }]}
                  numberOfLines={1}
                >
                  {todayData.journalText}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.todayEmpty}>
            <Text style={styles.todayEmptyText}>No mood logged yet today</Text>
            <PrimaryButton label="Log mood →" onPress={onLogNewMood} style={styles.todayEmptyCta} />
          </View>
        )}
      </View>

      {/* Week chart */}
      <View style={[styles.card, shadow("sm")]}>
        <View style={styles.todayHead}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Text style={styles.weekCount}>
            {weekData.filter((d) => d.moodId != null).length}/7 days
          </Text>
        </View>

        <WeekMoodChart weekData={weekData} />

        <View style={styles.legend}>
          {MOODS.map((mood) => (
            <View key={mood.id} style={styles.legendItem}>
              <MoodFace moodId={mood.id} size={28} />
              <Text style={styles.legendLabel}>{mood.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Journal entries */}
      <View style={[styles.card, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Journal</Text>

        {recentJournals.length === 0 ? (
          <Text style={styles.emptyState}>
            No journal entries yet. Log a mood to start writing.
          </Text>
        ) : (
          <View style={styles.journalList}>
            {recentJournals.map((entry) => {
              const m = entry.moodId ? MOODS.find((x) => x.id === entry.moodId) : null;
              return (
                <View key={entry.key} style={styles.journalRow}>
                  <View
                    style={[styles.journalIcon, { backgroundColor: m ? m.bg : colors.pulseBg }]}
                  >
                    {m ? <MoodFace moodId={m.id} size={28} selected /> : <Text>📓</Text>}
                  </View>

                  <View style={styles.flex}>
                    <View style={styles.journalMetaRow}>
                      {m ? (
                        <View
                          style={[
                            styles.moodPill,
                            { backgroundColor: m.bg, borderColor: `${m.color}33` },
                          ]}
                        >
                          <Text style={[styles.moodPillText, { color: m.textColor }]}>
                            {m.label}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.journalDate}>{entry.dateLabel}</Text>
                    </View>

                    {entry.emotions?.length > 0 ? (
                      <View style={styles.journalTags}>
                        {entry.emotions.map((tag) => (
                          <View
                            key={tag}
                            style={[
                              styles.journalTag,
                              {
                                backgroundColor: m ? m.bg : colors.border,
                                borderColor: m ? `${m.color}44` : colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.journalTagText,
                                { color: m ? m.textColor : colors.textMuted },
                              ]}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <Text style={styles.journalText}>{entry.text}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingBottom: 40 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  checkinCard: { alignItems: "center", paddingVertical: spacing.xxl },

  eyebrow: {
    ...type.caption,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  checkinHeading: { ...type.h2, fontFamily: fonts.semibold, fontSize: 26, color: colors.text },

  faceRing: {
    width: 120,
    height: 120,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.lg,
  },

  moodRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  moodBtn: { alignItems: "center", gap: 5 },
  moodBtnSelected: { transform: [{ scale: 1.14 }] },
  moodBtnLabel: { ...type.caption, fontSize: 10, color: colors.textMuted },

  ghostBtn: { alignItems: "center", paddingVertical: spacing.md },
  ghostBtnText: { ...type.bodyMedium, color: colors.textMuted },

  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  moodBadgeText: { ...type.bodyMedium, fontSize: 14 },

  promptRule: { borderLeftWidth: 3, paddingLeft: spacing.md },
  promptText: { ...type.body, fontStyle: "italic", color: colors.text },

  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    ...type.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.pulseBg,
  },

  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: spacing.sm },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  tagText: { ...type.small, color: colors.textMuted },

  journalActions: { marginTop: spacing.sm, gap: spacing.sm },

  sectionTitle: { ...type.title, fontFamily: fonts.semibold, color: colors.text },

  todayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  updateBtn: {
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  updateBtnText: { ...type.caption, fontSize: 12 },

  todayRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  todayLabel: { ...type.h3, fontFamily: fonts.semibold, fontSize: 18 },
  todayJournal: { ...type.small, opacity: 0.8 },

  todayEmpty: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  todayEmptyText: { ...type.body, flex: 1, color: colors.textMuted },
  todayEmptyCta: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },

  weekCount: { ...type.small, color: colors.textMuted },
  chartEmpty: { ...type.small, textAlign: "center", paddingVertical: 20, color: colors.textMuted },

  legend: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { alignItems: "center", gap: 4 },
  legendLabel: { ...type.caption, fontSize: 10, color: colors.textMuted },

  emptyState: { ...type.small, color: colors.textMuted, paddingVertical: spacing.md },

  journalList: { gap: spacing.md },
  journalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  journalIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  journalMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  moodPill: {
    paddingVertical: 1,
    paddingHorizontal: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  moodPillText: { ...type.caption, fontSize: 11 },
  journalDate: { ...type.caption, fontSize: 12, color: colors.textMuted },
  journalTags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  journalTag: {
    paddingVertical: 2,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  journalTagText: { ...type.caption, fontSize: 11 },
  journalText: { ...type.small, marginTop: 4, color: colors.text },
});

export default MoodDashboard;
