// Profile tab — the account header from the Sprint 4 UI refinement mockup
// sitting above the existing progress analytics (balance score, trends and
// strategic insights).
//
// The analytics themselves live in ProgressAnalytics; this screen embeds that
// page and supplies the header, so the two never drift apart.
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Icon from "../components/Icon";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import ProgressAnalytics from "./ProgressAnalytics";
import {
  TUTORIAL_ORDER,
  TUTORIAL_TARGETS,
  TUTORIALS,
  TutorialTarget,
  useTutorial,
  useTutorialContext,
} from "../tutorial";

function SettingsMenu({ visible, seeding, onSeed, onLogout, onOpenHelp, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
        {/* Swallow presses on the sheet itself so it does not close. */}
        <Pressable style={[styles.sheet, shadow("lg")]} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Settings</Text>

          <Pressable
            onPress={() => {
              onClose();
              onOpenHelp?.();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
          >
            <Icon name="help_outline" size={20} color={colors.blPrimary} />
            <Text style={styles.sheetRowText}>Help & tutorials</Text>
          </Pressable>

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

function HelpTutorials({ visible, onClose, onReplayTutorial }) {
  const { resetAll } = useTutorialContext();
  const [resetting, setResetting] = useState(false);

  const restartAll = async () => {
    setResetting(true);
    await resetAll();
    setResetting(false);
    onClose();
    onReplayTutorial?.("appOverview");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.helpBackdrop}>
        <View style={[styles.helpSheet, shadow("lg")]} accessibilityViewIsModal>
          <View style={styles.helpHeader}>
            <View style={styles.helpHeaderText}>
              <Text style={styles.helpTitle}>Help & tutorials</Text>
              <Text style={styles.helpSubtitle}>Replay a guide without changing your data.</Text>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close tutorials">
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.helpList}>
            {TUTORIAL_ORDER.map((id) => (
              <Pressable
                key={id}
                onPress={() => {
                  onClose();
                  onReplayTutorial?.(id);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.tutorialRow, pressed && styles.pressed]}
              >
                <View style={styles.tutorialRowText}>
                  <Text style={styles.tutorialName}>{TUTORIALS[id].title}</Text>
                  <Text style={styles.tutorialMeta}>{TUTORIALS[id].steps.length} steps</Text>
                </View>
                <Icon name="play_arrow" size={21} color={colors.blPrimary} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            onPress={restartAll}
            disabled={resetting}
            accessibilityRole="button"
            style={({ pressed }) => [styles.restartButton, pressed && styles.pressed]}
          >
            <Text style={styles.restartText}>{resetting ? "Resetting…" : "Restart all tutorials"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Profile({ user, onLogout, onReplayTutorial }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useTutorial("profile", { enabled: Boolean(user?.uid) });

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

            <TutorialTarget id={TUTORIAL_TARGETS.profile.settings}>
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
              >
                <Icon name="settings" size={26} color={colors.text} />
              </Pressable>
            </TutorialTarget>
          </View>

          <SettingsMenu
            visible={menuOpen}
            seeding={seeding}
            onSeed={onSeed}
            onLogout={onLogout}
            onOpenHelp={() => setHelpOpen(true)}
            onClose={() => setMenuOpen(false)}
          />
          <HelpTutorials
            visible={helpOpen}
            onClose={() => setHelpOpen(false)}
            onReplayTutorial={onReplayTutorial}
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
  helpBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31, 31, 46, 0.45)",
  },
  helpSheet: {
    maxHeight: "88%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  helpHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  helpHeaderText: { flex: 1, gap: spacing.xs },
  helpTitle: { ...type.h2, color: colors.text },
  helpSubtitle: { ...type.small, color: colors.textMuted },
  helpList: { gap: spacing.xs, paddingBottom: spacing.sm },
  tutorialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tutorialRowText: { flex: 1 },
  tutorialName: { ...type.bodyMedium, color: colors.text },
  tutorialMeta: { ...type.caption, color: colors.textMuted },
  restartButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.rowTint,
  },
  restartText: { ...type.label, color: colors.pulsePrimaryDark },
});

export default Profile;
