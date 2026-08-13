// Shared bottom-sheet shell for the saving modals.
//
// The web build repeated `<div className="modal-backdrop"><div
// className="modal-card saving-modal">` in four components. On native that
// pairing is a transparent <Modal> plus a Pressable backdrop, so it is worth
// naming once — it also keeps the hardware back button (onRequestClose)
// wired up consistently.
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, type } from "../theme";

export default function SavingModalShell({
  visible = true,
  title,
  subtitle,
  onClose,
  dismissOnBackdrop = true,
  children,
  footer,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={dismissOnBackdrop ? onClose : undefined}
        accessibilityLabel={dismissOnBackdrop ? "Close" : undefined}
      />

      <View style={styles.card} accessibilityViewIsModal accessibilityLabel={title}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  card: {
    maxHeight: "80%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: { ...type.h3, color: colors.text },
  subtitle: { ...type.small, color: colors.textMuted },
  body: { flexGrow: 0 },
  bodyContent: { gap: spacing.md },
  footer: { flexDirection: "row", gap: spacing.sm },
});
