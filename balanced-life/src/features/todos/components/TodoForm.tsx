/**
 * TodoForm — Add a new task with title, priority, and optional due date.
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
import { TodoPriority, PRIORITY_OPTIONS } from "../types/todo.types";

interface Props {
  onSubmit: (title: string, priority: TodoPriority, dueDate: string | null) => Promise<void>;
}

/** Generate next 7 day options for quick due date selection */
function getDateOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[d.getDay()];
    options.push({ label, value });
  }

  return options;
}

export function TodoForm({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dateOptions = getDateOptions();

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert("Empty task", "Please enter a task title.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(trimmed, priority, dueDate);
      setTitle("");
      setPriority("medium");
      setDueDate(null);
    } catch (e) {
      Alert.alert("Error", "Failed to create task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionLabel}>New Task</Text>

      {/* Title input */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
        placeholderTextColor={COLORS.textMuted}
        maxLength={120}
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      {/* Priority */}
      <Text style={styles.fieldLabel}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITY_OPTIONS.map((opt) => {
          const selected = priority === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                selected && { backgroundColor: opt.color + "20", borderColor: opt.color },
              ]}
              onPress={() => setPriority(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.chipEmoji}>{opt.emoji}</Text>
              <Text
                style={[
                  styles.chipText,
                  selected && { color: opt.color, fontWeight: "700" },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Due date */}
      <Text style={styles.fieldLabel}>Due date (optional)</Text>
      <View style={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, dueDate === null && styles.chipNone]}
          onPress={() => setDueDate(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, dueDate === null && { color: COLORS.primary, fontWeight: "700" }]}>
            None
          </Text>
        </TouchableOpacity>
        {dateOptions.map((opt) => {
          const selected = dueDate === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.chip,
                selected && styles.chipSelected,
              ]}
              onPress={() => setDueDate(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextSelected,
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
        title={saving ? "Adding..." : "Add Task"}
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
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipNone: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  chipSelected: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  saveButton: {
    marginTop: SPACING.md,
  },
});
