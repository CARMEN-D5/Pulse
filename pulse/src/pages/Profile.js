// Profile tab — the account header from the Sprint 4 UI refinement mockup
// sitting above the existing progress analytics (balance score, trends and
// strategic insights).
//
// The analytics themselves live in ProgressAnalytics; this screen embeds that
// page and supplies the header, so the two never drift apart.
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import Icon from "../components/Icon";
import { colors, fonts, profileColors, radius, shadow, spacing, type } from "../theme";
import ProgressAnalytics from "./ProgressAnalytics";
import { getCurrentUser, updateUserProfile, changePassword, uploadAvatar } from "../auth/authService";
import { updateUserDoc } from "../firestore/users";
import {
  TUTORIAL_ORDER,
  TUTORIAL_TARGETS,
  TUTORIALS,
  TutorialTarget,
  useTutorial,
  useTutorialContext,
} from "../tutorial";

function SettingsMenu({ visible, seeding, onSeed, onLogout, onOpenHelp, onOpenEdit, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
        {/* Swallow presses on the sheet itself so it does not close. */}
        <Pressable style={[styles.sheet, shadow("lg")]} onPress={() => {}}>
          <Text style={styles.sheetTitle}>Settings</Text>

          <Pressable
            onPress={() => {
              onClose();
              onOpenEdit?.();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
          >
            <Icon name="edit" size={20} color={colors.pulsePrimaryDark} />
            <Text style={styles.sheetRowText}>Edit profile</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onOpenHelp?.();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
          >
            <Icon name="help_outline" size={20} color={colors.pulsePrimaryDark} />
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
              color={colors.pulsePrimaryDark}
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
                <Icon name="play_arrow" size={21} color={colors.pulsePrimaryDark} />
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

function EditProfileModal({ visible, user, onClose, onUpdated }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUri, setAvatarUri] = useState(user?.photoURL || null);

  React.useEffect(() => {
    if (visible) {
      setDisplayName(user?.displayName || "");
      setCurrentPassword("");
      setNewPassword("");
      setError("");
      setSuccess("");
      setAvatarUri(user?.photoURL || null);
    }
  }, [visible, user]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) throw new Error("Not signed in.");

      // Validate password fields before any writes so nothing is partially saved.
      const wantsPasswordChange = !!(newPassword || currentPassword);
      if (wantsPasswordChange) {
        if (!newPassword || !currentPassword) {
          throw new Error("Both current and new password are required to change your password.");
        }
        if (newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters.");
        }
      }

      let photoURL = currentUser.photoURL;
      if (avatarUri && avatarUri !== currentUser.photoURL) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const upload = await uploadAvatar(currentUser.uid, blob);
        if (!upload.ok) throw new Error(upload.error || "Failed to upload avatar.");
        photoURL = upload.url;
      }

      const profileResult = await updateUserProfile({
        displayName: displayName.trim() || currentUser.displayName,
        photoURL,
      });
      if (!profileResult.ok) throw new Error(profileResult.error);

      const docResult = await updateUserDoc(currentUser.uid, {
        displayName: displayName.trim() || currentUser.displayName,
        photoURL,
      });
      if (docResult && !docResult.ok) {
        throw new Error(docResult.error || "Failed to update profile document.");
      }

      if (wantsPasswordChange) {
        const pwResult = await changePassword({ currentPassword, newPassword });
        if (!pwResult.ok) throw new Error(pwResult.error);
      }

      setSuccess("Profile updated!");
      setCurrentPassword("");
      setNewPassword("");
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.helpBackdrop}>
        <View style={[styles.helpSheet, shadow("lg")]}>
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>Edit Profile</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}>
            <Pressable onPress={pickAvatar} style={styles.avatarEditRow} accessibilityRole="button">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarEdit} />
              ) : (
                <LinearGradient colors={profileColors.gradient} style={styles.avatarEdit}>
                  <Icon name="camera_alt" size={28} color="#fff" />
                </LinearGradient>
              )}
              <Text style={styles.avatarEditLabel}>Change photo</Text>
            </Pressable>

            <Text style={styles.editLabel}>Display Name</Text>
            <TextInput
              style={styles.editInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.editLabel, { marginTop: spacing.md }]}>Change Password</Text>
            <TextInput
              style={styles.editInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <TextInput
              style={styles.editInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password (6+ characters)"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            {error ? <Text style={styles.editError}>{error}</Text> : null}
            {success ? <Text style={styles.editSuccess}>{success}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save Changes"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Profile({ user, onLogout, onReplayTutorial }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [, forceUpdate] = useState(0);
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
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={profileColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
            )}

            <View style={styles.identityBlock}>
              <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
                {displayName}
              </Text>
              {user?.email ? (
                <Text style={styles.identityEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>

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
            onOpenEdit={() => setEditOpen(true)}
            onClose={() => setMenuOpen(false)}
          />
          <HelpTutorials
            visible={helpOpen}
            onClose={() => setHelpOpen(false)}
            onReplayTutorial={onReplayTutorial}
          />
          <EditProfileModal
            visible={editOpen}
            user={user}
            onClose={() => setEditOpen(false)}
            onUpdated={() => forceUpdate((n) => n + 1)}
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.text },
  identityBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...type.h2,
    fontFamily: fonts.extrabold,
    fontSize: 22,
    color: colors.text,
  },
  identityEmail: {
    ...type.caption,
    fontSize: 13,
    color: colors.textMuted,
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
  avatarEditRow: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarEdit: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditLabel: {
    ...type.caption,
    color: colors.pulsePrimaryDark,
  },
  editLabel: {
    ...type.label,
    color: colors.text,
    fontSize: 13,
  },
  editInput: {
    ...type.bodyMedium,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  editError: {
    ...type.small,
    color: "#d32f2f",
  },
  editSuccess: {
    ...type.small,
    color: "#2e7d32",
  },
  saveButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.pulsePrimaryDark,
  },
  saveButtonText: {
    ...type.label,
    color: "#fff",
    fontFamily: fonts.bold,
  },
});

export default Profile;
