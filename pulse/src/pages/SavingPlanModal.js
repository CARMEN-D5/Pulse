import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import SavingModalShell from "./SavingModalShell";
import DateField from "../components/DateField";
import SegmentedField from "../components/SegmentedField";
import { PrimaryButton } from "../components/ui";
import { colors, fonts, radius, spacing, type } from "../theme";

const ICONS = ["✈️", "🏠", "🚗", "💻", "📱", "🎓", "💍", "🎁", "🏖️", "💰", "🐶", "🎮"];
const COLOURS = ["#4d96ff", "#ff6b6b", "#9b5de5", "#f6c453", "#80b918", "#00b4d8", "#f72585", "#fb8500"];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function SavingPlanModal({ plan, onClose, onSave }) {
  const [draft, setDraft] = useState(
    plan || {
      name: "",
      icon: "✈️",
      color: "#4d96ff",
      targetAmount: "",
      dueDate: "",
      status: "active",
    }
  );
  const [saving, setSaving] = useState(false);

  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const valid = draft.name.trim() && Number(draft.targetAmount) > 0 && draft.dueDate;

  return (
    <SavingModalShell
      title={plan ? "Edit saving plan" : "Create a saving plan"}
      onClose={onClose}
      footer={
        <>
          <PrimaryButton label="Cancel" variant="danger" onPress={onClose} style={styles.flex} />
          <PrimaryButton
            label={saving ? "Saving…" : "Save"}
            disabled={!valid || saving}
            loading={saving}
            onPress={async () => {
              if (!valid) return;
              setSaving(true);
              await onSave(draft);
              setSaving(false);
            }}
            style={styles.flex}
          />
        </>
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Plan name</Text>
        <TextInput
          style={styles.input}
          value={draft.name}
          onChangeText={(value) => change("name", value)}
          placeholder="Plan name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((icon) => (
            <Pressable
              key={icon}
              onPress={() => change("icon", icon)}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${icon}`}
              accessibilityState={{ selected: draft.icon === icon }}
              style={({ pressed }) => [
                styles.iconOption,
                draft.icon === icon && styles.iconOptionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.iconText}>{icon}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={ICONS.includes(draft.icon) ? "" : draft.icon}
          onChangeText={(value) => change("icon", value)}
          maxLength={4}
          placeholder="Custom icon ✨"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Custom icon"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Plan colour</Text>
        <View style={styles.colourRow}>
          {COLOURS.map((colour) => (
            <Pressable
              key={colour}
              onPress={() => change("color", colour)}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${colour}`}
              accessibilityState={{ selected: draft.color === colour }}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: colour },
                draft.color === colour && styles.swatchSelected,
                pressed && styles.pressed,
              ]}
            />
          ))}
        </View>
        {/* React Native has no <input type="color">, so a custom colour is
            entered as a hex value instead of picked from an OS colour wheel. */}
        <TextInput
          style={styles.input}
          value={draft.color}
          onChangeText={(value) => change("color", value)}
          autoCapitalize="none"
          maxLength={7}
          placeholder="#4d96ff"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Custom colour hex"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Goal amount</Text>
        <TextInput
          style={styles.input}
          value={String(draft.targetAmount ?? "")}
          onChangeText={(value) => change("targetAmount", value)}
          keyboardType="decimal-pad"
          placeholder="$0.00"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Due date</Text>
        <DateField
          value={draft.dueDate}
          onChange={(value) => change("dueDate", value)}
          placeholder="Due date"
        />
      </View>

      {plan ? (
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <SegmentedField
            options={STATUS_OPTIONS}
            value={draft.status}
            onChange={(value) => change("status", value)}
          />
        </View>
      ) : null}
    </SavingModalShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  field: { gap: spacing.sm },
  label: { ...type.label, color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.body,
    color: colors.text,
  },

  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  iconOption: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  iconOptionSelected: { borderColor: colors.blPrimary, backgroundColor: colors.accentSoft },
  iconText: { fontSize: 20 },

  colourRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.text },
});
