/**
 * SocialForm — Form to log a social interaction.
 * Contact name (with quick-select from known contacts), interaction type, optional note.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { Card } from "../../../shared/components/Card";
import { Button } from "../../../shared/components/Button";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import {
  InteractionType,
  INTERACTION_OPTIONS,
  KnownContact,
} from "../types/social.types";

interface SocialFormProps {
  knownContacts: KnownContact[];
  onSubmit: (data: {
    contactName: string;
    interactionType: InteractionType;
    note: string;
  }) => Promise<void>;
}

export function SocialForm({ knownContacts, onSubmit }: SocialFormProps) {
  const [contactName, setContactName] = useState("");
  const [interactionType, setInteractionType] = useState<InteractionType | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!contactName.trim()) {
      Alert.alert("Missing Info", "Please enter a contact name.");
      return;
    }
    if (!interactionType) {
      Alert.alert("Missing Info", "Please select an interaction type.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        contactName: contactName.trim(),
        interactionType,
        note: note.trim(),
      });
      setContactName("");
      setInteractionType(null);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  // Show top 6 known contacts as quick-select chips
  const quickContacts = knownContacts.slice(0, 6);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Log Interaction</Text>

      {/* Contact name */}
      <Text style={styles.label}>Who did you connect with?</Text>
      <TextInput
        style={styles.nameInput}
        placeholder="Contact name"
        placeholderTextColor={COLORS.textMuted}
        value={contactName}
        onChangeText={setContactName}
        maxLength={50}
      />

      {/* Quick-select known contacts */}
      {quickContacts.length > 0 && (
        <View style={styles.quickRow}>
          {quickContacts.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[
                styles.quickChip,
                contactName === c.name && styles.quickChipSelected,
              ]}
              onPress={() => setContactName(c.name)}
            >
              <Text
                style={[
                  styles.quickText,
                  contactName === c.name && styles.quickTextSelected,
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Interaction type */}
      <Text style={styles.label}>How?</Text>
      <View style={styles.typeRow}>
        {INTERACTION_OPTIONS.map((opt) => {
          const selected = interactionType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={[styles.typeChip, selected && styles.typeChipSelected]}
              onPress={() => setInteractionType(opt.type)}
            >
              <Text style={styles.typeEmoji}>{opt.emoji}</Text>
              <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
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
        title={submitting ? "Saving..." : "Log Interaction"}
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
  nameInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.sm,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  quickChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  quickText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  quickTextSelected: {
    color: COLORS.primary,
  },
  typeRow: {
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
