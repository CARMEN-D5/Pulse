// Profile tab — the account header from the Sprint 4 UI refinement mockup
// sitting above the existing progress analytics (balance score, trends and
// strategic insights).
//
// The analytics themselves live in ProgressAnalytics; this screen embeds that
// page and supplies the header, so the two never drift apart.
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import Icon from "../components/Icon";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import ProgressAnalytics from "./ProgressAnalytics";

function SettingsMenu({ visible, seeding, onSeed, onLogout, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
        {/* Swallow presses on the sheet itself so it does not close. */}
        <Pressable style={[styles.sheet, shadow("lg")]} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Settings</Text>

          <Pressable
            onPress={() => {
              onSeed?.();
            }}
            disabled={seeding}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetRow, (pressed || seeding) && styles.pressed]}
          >
            <Icon
              name={seeding ? "hourglass_top" : "science"}
              size={20}
              color={colors.blPrimary}
            />
            <Text style={styles.sheetRowText}>
              {seeding ? "Generating sample data…" : "Generate sample data"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onLogout?.();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
          >
            <Icon name="logout" size={20} color={colors.pulsePrimaryDark} />
            <Text style={[styles.sheetRowText, styles.sheetRowDanger]}>Log out</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Profile({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : null) ||
    "User Name";
  const initials = (displayName.charAt(0) || "?").toUpperCase();

  return (
    <ProgressAnalytics
      user={user}
      embedded
      renderHeader={({ onSeed, seeding }) => (
        <>
          <View style={styles.header}>
            <LinearGradient
              colors={["#c9184a", "#ff8fa3"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>

            <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
              {displayName}
            </Text>

            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
            >
              <Icon name="settings" size={26} color={colors.text} />
            </Pressable>
          </View>

          <SettingsMenu
            visible={menuOpen}
            seeding={seeding}
            onSeed={onSeed}
            onLogout={onLogout}
            onClose={() => setMenuOpen(false)}
          />
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 24, color: "#fff" },
  name: {
    flex: 1,
    ...type.h2,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.pulsePrimaryDark,
  },
  gear: { padding: spacing.xs },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(31, 31, 46, 0.35)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  sheetTitle: {
    ...type.label,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  sheetRowText: { ...type.bodyMedium, color: colors.text },
  sheetRowDanger: { color: colors.pulsePrimaryDark },
});

export default Profile;
