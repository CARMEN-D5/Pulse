/**
 * ActivityForm — Form to log a new physical activity.
 * Activity type picker, duration chips, intensity selector, optional note.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { Card } from "../../../shared/components/Card";
import { Button } from "../../../shared/components/Button";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import {
  ActivityType,
  Intensity,
  ACTIVITY_OPTIONS,
  INTENSITY_OPTIONS,
  DURATION_PRESETS,
} from "../types/activity.types";

interface ActivityFormProps {
  onSubmit: (data: {
    type: ActivityType;
    duration: number;
    intensity: Intensity;
    note: string;
  }) => Promise<void>;
}

export function ActivityForm({ onSubmit }: ActivityFormProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveDuration = duration ?? (customDuration ? parseInt(customDuration, 10) : 0);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert("Missing Info", "Please select an activity type.");
      return;
    }
    if (!effectiveDuration || effectiveDuration <= 0) {
      Alert.alert("Missing Info", "Please select or enter a duration.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        type: selectedType,
        duration: effectiveDuration,
        intensity,
        note: note.trim(),
      });
      // Reset form
      setSelectedType(null);
      setDuration(null);
      setCustomDuration("");
      setIntensity("moderate");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Log Activity</Text>

      {/* Activity type */}
      <Text style={styles.label}>What did you do?</Text>
      <View style={styles.chipGrid}>
        {ACTIVITY_OPTIONS.map((opt) => {
          const selected = selectedType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.typeChip, selected && styles.typeChipSelected]}
              onPress={() => setSelectedType(opt.type)}
            >
              <Text style={styles.typeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Duration */}
      <Text style={styles.label}>How long? (minutes)</Text>
      <View style={styles.chipRow}>
        {DURATION_PRESETS.map((mins) => {
          const selected = duration === mins && !customDuration;
          return (
            <TouchableOpacity
              key={mins}
              style={[styles.durChip, selected && styles.durChipSelected]}
              onPress={() => {
                setDuration(mins);
                setCustomDuration("");
              }}
            >
              <Text style={[styles.durText, selected && styles.durTextSelected]}>
                {mins}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TextInput
          style={styles.customDuration}
          placeholder="Custom"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
          maxLength={3}
          value={customDuration}
          onChangeText={(val) => {
            setCustomDuration(val);
            setDuration(null);
          }}
        />
      </View>

      {/* Intensity */}
      <Text style={styles.label}>Intensity</Text>
      <View style={styles.chipRow}>
        {INTENSITY_OPTIONS.map((opt) => {
          const selected = intensity === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.intensityChip,
                selected && { backgroundColor: opt.color + "20", borderColor: opt.color },
              ]}
              onPress={() => setIntensity(opt.value)}
            >
              <Text style={styles.intensityEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.intensityText,
                  selected && { color: opt.color, fontWeight: "700" },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Note */}
      <TextInput
        style={styles.noteInput}
        placeholder="Add a note (optional)"
        placeholderTextColor={COLORS.textMuted}
        value={note}
        onChangeText={setNote}
        maxLength={200}
        multiline
      />

      {/* Submit */}
      <Button
        title={submitting ? "Saving..." : "Log Activity"}
        onPress={handleSubmit}
        style={styles.submitButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  // Activity type chips
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  typeLabelSelected: {
    color: COLORS.primary,
  },
  // Duration chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    alignItems: "center",
  },
  durChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  durText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  durTextSelected: {
    color: "#FFFFFF",
  },
  customDuration: {
    width: 70,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  // Intensity
  intensityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  intensityEmoji: {
    fontSize: 14,
  },
  intensityText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  // Note
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    minHeight: 48,
    textAlignVertical: "top",
  },
  submitButton: {
    marginTop: SPACING.xs,
  },
});
