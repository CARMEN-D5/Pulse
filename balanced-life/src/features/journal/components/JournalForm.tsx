/**
 * JournalForm — Write a new journal entry with optional prompt and mood.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { Card, Button } from "../../../shared/components";
import {
  GuidedPrompt,
  JournalMood,
  JOURNAL_MOODS,
} from "../types/journal.types";
import { PromptSelector } from "./PromptSelector";

interface Props {
  onSubmit: (
    title: string,
    body: string,
    promptId: string | null,
    mood: JournalMood | null
  ) => Promise<void>;
}

export function JournalForm({ onSubmit }: Props) {
  const [selectedPrompt, setSelectedPrompt] = useState<GuidedPrompt | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<JournalMood | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePromptSelect = (prompt: GuidedPrompt) => {
    if (selectedPrompt?.id === prompt.id) {
      // Deselect
      setSelectedPrompt(null);
      setTitle("");
    } else {
      setSelectedPrompt(prompt);
      setTitle(prompt.text);
    }
  };

  const handleSave = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      Alert.alert("Empty entry", "Please write something before saving.");
      return;
    }

    setSaving(true);
    try {
      const finalTitle = title.trim() || "Untitled Entry";
      await onSubmit(finalTitle, trimmedBody, selectedPrompt?.id ?? null, mood);
      // Reset form
      setSelectedPrompt(null);
      setTitle("");
      setBody("");
      setMood(null);
    } catch (e) {
      Alert.alert("Error", "Failed to save journal entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>New Entry</Text>

      {/* Guided prompts */}
      <PromptSelector
        selectedId={selectedPrompt?.id ?? null}
        onSelect={handlePromptSelect}
      />

      {/* Title */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="Title (optional)"
        placeholderTextColor={COLORS.textMuted}
        maxLength={80}
        returnKeyType="next"
      />

      {/* Body */}
      <TextInput
        style={styles.bodyInput}
        value={body}
        onChangeText={setBody}
        placeholder="What's on your mind?"
        placeholderTextColor={COLORS.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={2000}
      />

      {/* Character count */}
      <Text style={styles.charCount}>{body.length}/2000</Text>

      {/* Mood selector */}
      <Text style={styles.fieldLabel}>How are you feeling?</Text>
      <View style={styles.moodRow}>
        {JOURNAL_MOODS.map((opt) => {
          const selected = mood === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.moodChip, selected && styles.moodChipSelected]}
              onPress={() => setMood(selected ? null : opt.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  selected && styles.moodLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save */}
      <Button
        title={saving ? "Saving..." : "Save Entry"}
        onPress={handleSave}
        disabled={saving}
        style={styles.saveButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  titleInput: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  bodyInput: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: SPACING.xs,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  moodRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  moodChip: {
    alignItems: "center",
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  moodChipSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  moodEmoji: {
    fontSize: 22,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginTop: 2,
  },
  moodLabelSelected: {
    color: COLORS.primary,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
});
