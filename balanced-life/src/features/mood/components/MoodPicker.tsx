/**
 * MoodPicker — Emoji-based mood selector.
 * Displays 5 mood options in a row. Tapping one selects it.
 * Optional text note input appears after selection.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { MoodLevel, MoodOption, MOOD_OPTIONS } from "../types/mood.types";

interface MoodPickerProps {
  /** Called when user confirms mood selection */
  onSelect: (level: MoodLevel, note?: string) => void;
  /** If true, show a compact version (no note input) */
  compact?: boolean;
  /** Initial selected level */
  initialLevel?: MoodLevel;
}

export function MoodPicker({ onSelect, compact = false, initialLevel }: MoodPickerProps) {
  const [selected, setSelected] = useState<MoodLevel | null>(initialLevel ?? null);
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (level: MoodLevel) => {
    setSelected(level);
    if (compact) {
      onSelect(level);
    }
  };

  const handleConfirm = () => {
    if (selected) {
      setConfirmed(true);
      onSelect(selected, note.trim() || undefined);
    }
  };

  if (confirmed) {
    const option = MOOD_OPTIONS.find((o) => o.level === selected)!;
    return (
      <View style={styles.confirmedContainer}>
        <Text style={styles.confirmedEmoji}>{option.emoji}</Text>
        <Text style={[styles.confirmedLabel, { color: option.color }]}>
          Feeling {option.label.toLowerCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How are you feeling?</Text>

      <View style={styles.emojiRow}>
        {MOOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.level}
            style={[
              styles.emojiButton,
              selected === option.level && [
                styles.emojiSelected,
                { borderColor: option.color, backgroundColor: option.color + "15" },
              ],
            ]}
            onPress={() => handleSelect(option.level)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.emojiLabel,
                selected === option.level && { color: option.color, fontWeight: "700" },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!compact && selected && (
        <>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note (optional)..."
            placeholderTextColor={COLORS.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: MOOD_OPTIONS.find((o) => o.level === selected)!.color }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmText}>Save Mood</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: SPACING.md,
  },
  prompt: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  emojiButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiSelected: {
    borderWidth: 2,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 60,
    textAlignVertical: "top",
  },
  confirmButton: {
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confirmedContainer: {
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
  },
  confirmedEmoji: {
    fontSize: 48,
  },
  confirmedLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
  },
});
