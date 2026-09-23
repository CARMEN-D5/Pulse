// Shared dropdown/select control — a pressable trigger showing the current
// value, opening a small anchored menu of options. Used in place of
// `@react-native-picker/picker` so the menu matches the app's own design
// tokens instead of the OS-native picker UI.
import React, { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Icon from "./Icon";
import { colors, radius, shadow, spacing, type } from "../theme";

function Dropdown({ label, options, value, onChange, style, accessibilityLabel }) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState(null);

  const selected = options.find((o) => o.value === value);

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setMenuLayout({ x, y, width, height });
      setOpen(true);
    });
  };

  const closeMenu = () => setOpen(false);

  const handleSelect = (optionValue) => {
    closeMenu();
    if (optionValue !== value) onChange(optionValue);
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        ref={triggerRef}
        onPress={openMenu}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? ""}
        </Text>
        <Icon name={open ? "expand_less" : "expand_more"} size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.backdrop} onPress={closeMenu}>
          {menuLayout ? (
            <View
              style={[
                styles.menu,
                {
                  top: menuLayout.y + menuLayout.height + 4,
                  left: menuLayout.x,
                  minWidth: menuLayout.width,
                },
              ]}
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {isSelected ? (
                      <Icon name="check" size={18} color={colors.pulsePrimary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.textMuted, marginBottom: spacing.xs },

  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerPressed: { opacity: 0.8 },
  triggerText: { ...type.bodyMedium, color: colors.text },

  backdrop: { flex: 1 },
  menu: {
    position: "absolute",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    ...shadow("md"),
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionSelected: { backgroundColor: colors.rowTint },
  optionPressed: { opacity: 0.7 },
  optionText: { ...type.body, color: colors.text },
  optionTextSelected: { fontFamily: type.bodyMedium.fontFamily, color: colors.pulsePrimary },
});

export default Dropdown;
