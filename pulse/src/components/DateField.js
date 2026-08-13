// Date picker shaped like the web build's <input type="date">.
//
// It reads and writes the same "YYYY-MM-DD" strings the Firestore documents
// already store, so nothing downstream had to change. Tapping opens the
// platform picker — a wheel on iOS (inside a modal, since iOS pickers are
// inline views), the system dialog on Android, and a real <input type="date">
// on web via react-native-web.
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import Icon from "./Icon";
import { PrimaryButton } from "./ui";
import { colors, radius, spacing, type } from "../theme";

/** "YYYY-MM-DD" -> Date at local midnight (avoids UTC day-shift). */
function parseISODate(value) {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/** Date -> "YYYY-MM-DD" in local time. */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = true,
  minimumDate,
  maximumDate,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseISODate(value));

  const openPicker = () => {
    setDraft(parseISODate(value));
    setOpen(true);
  };

  // Android's picker is a system dialog that fires once and dismisses itself,
  // so it commits straight away. iOS renders an inline spinner that needs its
  // own "Done" affordance, hence the modal below.
  const handleAndroidChange = (event, selected) => {
    setOpen(false);
    if (event.type === "set" && selected) onChange(toISODate(selected));
  };

  return (
    <View style={style}>
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={value ? `Date: ${value}. Tap to change.` : placeholder}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <Icon name="calendar_today" size={18} color={colors.blOutline} />
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        {clearable && value ? (
          <Pressable
            onPress={() => onChange("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear date"
          >
            <Icon name="close" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>

      {open && Platform.OS === "android" ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS !== "android" ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, selected) => selected && setDraft(selected)}
            />
            <PrimaryButton
              label="Done"
              onPress={() => {
                onChange(toISODate(draft));
                setOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  pressed: { opacity: 0.7 },
  value: { ...type.body, flex: 1, color: colors.text },
  placeholder: { color: colors.textMuted },

  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.md,
  },
});
