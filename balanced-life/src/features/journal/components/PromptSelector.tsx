/**
 * PromptSelector — Horizontally scrollable guided prompt chips.
 * Tap a prompt to auto-fill the journal title.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { GuidedPrompt, GUIDED_PROMPTS } from "../types/journal.types";

interface Props {
  selectedId: string | null;
  onSelect: (prompt: GuidedPrompt) => void;
}

export function PromptSelector({ selectedId, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Need inspiration?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {GUIDED_PROMPTS.map((prompt) => {
          const selected = selectedId === prompt.id;
          return (
            <TouchableOpacity
              key={prompt.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(prompt)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{prompt.emoji}</Text>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
                numberOfLines={2}
              >
                {prompt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  scrollContent: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 200,
  },
  chipSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },
});
