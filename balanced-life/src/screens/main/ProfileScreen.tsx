/**
 * ProfileScreen — User profile editing, badge collection, notification settings, and account management.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";

import { auth, db } from "../../config/firebase";
import { useAuthStore } from "../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../config/theme";
import { Card, Button } from "../../shared/components";
import { BadgeGrid } from "../../features/badges/components/BadgeGrid";
import { fetchUnlockedBadges } from "../../features/badges/services/badgeService";
import { UnlockedBadge } from "../../features/badges/types/badge.types";
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
} from "../../features/notifications/types/notification.types";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "../../features/notifications/services/notificationService";

// ── Avatar options ──

const AVATAR_EMOJIS = [
  "😊", "😎", "🤓", "🧑‍💻", "🧘", "🏃", "🎨", "🌟",
  "🦊", "🐱", "🐶", "🦉", "🐼", "🦁", "🐸", "🦋",
  "🌸", "🔥", "💎", "🌈", "🍀", "🎯", "⚡", "🚀",
];

const AVATAR_COLORS = [
  "#2E75B6", "#8B5CF6", "#EF4444", "#10B981",
  "#F59E0B", "#3B82F6", "#EC4899", "#6366F1",
];

interface AvatarData {
  emoji: string;
  color: string;
}

const DEFAULT_AVATAR: AvatarData = { emoji: "", color: COLORS.primary };

// ── Time/day options (notification settings) ──

const TIME_OPTIONS = [
  { label: "6:00 AM", hour: 6, minute: 0 },
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "10:00 AM", hour: 10, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
  { label: "8:00 PM", hour: 20, minute: 0 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

const DAY_OPTIONS = [
  { label: "Sunday", day: 0 },
  { label: "Monday", day: 1 },
  { label: "Friday", day: 5 },
  { label: "Saturday", day: 6 },
];

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, "0");
  return `${h}:${m} ${ampm}`;
}

function getDayLabel(day: number): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? "Sunday";
}

// ── Main component ──

export function ProfileScreen() {
  const { user } = useAuthStore();
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);

  // Profile editing state
  const [avatarData, setAvatarData] = useState<AvatarData>(DEFAULT_AVATAR);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchUnlockedBadges(user.uid)
        .then(setUnlockedBadges)
        .catch((e) => console.warn("Failed to load badges:", e));
      loadNotificationSettings(user.uid)
        .then(setNotifSettings)
        .catch((e) => console.warn("Failed to load notification settings:", e));
      // Load avatar from Firestore
      getDoc(doc(db, "users", user.uid, "settings", "profile"))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.avatar) setAvatarData(data.avatar);
          }
        })
        .catch(() => {});
    }, [user])
  );

  // ── Name editing ──

  const handleStartEditName = () => {
    setNameInput(user?.displayName || "");
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !auth.currentUser) {
      setEditingName(false);
      return;
    }
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed });
      // Force re-render by refreshing auth state
      useAuthStore.getState().setUser({ ...auth.currentUser } as any);
      setEditingName(false);
    } catch (e) {
      Alert.alert("Error", "Failed to update name.");
    }
  };

  // ── Avatar editing ──

  const handleSelectAvatar = async (emoji: string, color: string) => {
    if (!user) return;
    const newAvatar = { emoji, color };
    setAvatarData(newAvatar);
    setShowAvatarPicker(false);
    try {
      await setDoc(
        doc(db, "users", user.uid, "settings", "profile"),
        { avatar: newAvatar },
        { merge: true }
      );
    } catch (e) {
      console.warn("Failed to save avatar:", e);
    }
  };

  // ── Notification settings ──

  const updateSettings = async (patch: Partial<NotificationSettings>) => {
    if (!user) return;
    const updated = { ...notifSettings, ...patch };
    setNotifSettings(updated);
    try {
      await saveNotificationSettings(user.uid, updated);
    } catch (e) {
      console.warn("Failed to save notification settings:", e);
    }
  };

  const updateDailyReminder = async (patch: Partial<NotificationSettings["dailyReminder"]>) => {
    const updated = { ...notifSettings.dailyReminder, ...patch };
    await updateSettings({ dailyReminder: updated });
  };

  const updateWeeklyReview = async (patch: Partial<NotificationSettings["weeklyReview"]>) => {
    const updated = { ...notifSettings.weeklyReview, ...patch };
    await updateSettings({ weeklyReview: updated });
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut(auth) },
    ]);
  };

  // ── Derived values ──

  const displayName = user?.displayName || "User";
  const avatarLetter = (user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase();
  const hasCustomAvatar = avatarData.emoji !== "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>

        {/* User Info */}
        <Card style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: avatarData.color }]}>
              {hasCustomAvatar ? (
                <Text style={styles.avatarEmoji}>{avatarData.emoji}</Text>
              ) : (
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              )}
            </View>
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </View>
          </TouchableOpacity>

          {/* Name */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={30}
                placeholder="Enter your name"
                onSubmitEditing={handleSaveName}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={handleStartEditName} style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        {/* Badge Collection */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <BadgeGrid unlockedBadges={unlockedBadges} />

        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.settingsCard}>
          {/* Master toggle */}
          <ToggleRow
            label="Notifications"
            value={notifSettings.enabled}
            onToggle={(val) => updateSettings({ enabled: val })}
          />

          {notifSettings.enabled && (
            <>
              {/* Daily Reminder */}
              <ToggleRow
                label="Daily Check-in Reminder"
                value={notifSettings.dailyReminder.enabled}
                onToggle={(val) => updateDailyReminder({ enabled: val })}
              />
              {notifSettings.dailyReminder.enabled && (
                <>
                  <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={() => setShowTimePicker(!showTimePicker)}
                  >
                    <Text style={styles.settingsLabel}>  Reminder Time</Text>
                    <Text style={styles.settingsValueTap}>
                      {formatTime(notifSettings.dailyReminder.hour, notifSettings.dailyReminder.minute)} ▾
                    </Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <View style={styles.optionGrid}>
                      {TIME_OPTIONS.map((opt) => {
                        const selected =
                          opt.hour === notifSettings.dailyReminder.hour &&
                          opt.minute === notifSettings.dailyReminder.minute;
                        return (
                          <TouchableOpacity
                            key={opt.label}
                            style={[styles.optionChip, selected && styles.optionChipSelected]}
                            onPress={() => {
                              updateDailyReminder({ hour: opt.hour, minute: opt.minute });
                              setShowTimePicker(false);
                            }}
                          >
                            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Weekly Review Reminder */}
              <ToggleRow
                label="Weekly Review Reminder"
                value={notifSettings.weeklyReview.enabled}
                onToggle={(val) => updateWeeklyReview({ enabled: val })}
              />
              {notifSettings.weeklyReview.enabled && (
                <>
                  <TouchableOpacity
                    style={styles.settingsRow}
                    onPress={() => setShowDayPicker(!showDayPicker)}
                  >
                    <Text style={styles.settingsLabel}>  Review Day</Text>
                    <Text style={styles.settingsValueTap}>
                      {getDayLabel(notifSettings.weeklyReview.day)}{" "}
                      {formatTime(notifSettings.weeklyReview.hour, notifSettings.weeklyReview.minute)} ▾
                    </Text>
                  </TouchableOpacity>
                  {showDayPicker && (
                    <View style={styles.optionGrid}>
                      {DAY_OPTIONS.map((opt) => {
                        const selected = opt.day === notifSettings.weeklyReview.day;
                        return (
                          <TouchableOpacity
                            key={opt.label}
                            style={[styles.optionChip, selected && styles.optionChipSelected]}
                            onPress={() => {
                              updateWeeklyReview({ day: opt.day });
                              setShowDayPicker(false);
                            }}
                          >
                            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Achievement notifications */}
              <ToggleRow
                label="Streak Milestones"
                value={notifSettings.streakMilestones}
                onToggle={(val) => updateSettings({ streakMilestones: val })}
              />
              <ToggleRow
                label="Badge Unlocks"
                value={notifSettings.badgeUnlocks}
                onToggle={(val) => updateSettings({ badgeUnlocks: val })}
              />
            </>
          )}
        </Card>

        <Text style={styles.sectionTitle}>About</Text>
        <Card style={styles.settingsCard}>
          <SettingsRow label="Version" value="1.0.0" />
          <SettingsRow label="Terms of Service" value="" />
          <SettingsRow label="Privacy Policy" value="" />
        </Card>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        />
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>

            {/* Color picker */}
            <Text style={styles.modalSubtitle}>Background Color</Text>
            <View style={styles.colorGrid}>
              {AVATAR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    avatarData.color === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setAvatarData((prev) => ({ ...prev, color }))}
                />
              ))}
            </View>

            {/* Emoji picker */}
            <Text style={styles.modalSubtitle}>Emoji</Text>
            <View style={styles.emojiGrid}>
              {AVATAR_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption,
                    avatarData.emoji === emoji && styles.emojiOptionSelected,
                  ]}
                  onPress={() => handleSelectAvatar(emoji, avatarData.color)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview + actions */}
            <View style={styles.modalPreview}>
              <View style={[styles.previewAvatar, { backgroundColor: avatarData.color }]}>
                {avatarData.emoji ? (
                  <Text style={styles.previewEmoji}>{avatarData.emoji}</Text>
                ) : (
                  <Text style={styles.previewLetter}>{avatarLetter}</Text>
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Reset to Default"
                variant="ghost"
                onPress={() => handleSelectAvatar("", COLORS.primary)}
              />
              <Button
                title="Close"
                variant="outline"
                onPress={() => setShowAvatarPicker(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ──

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + "80" }}
        thumbColor={value ? COLORS.primary : "#f4f3f4"}
      />
    </View>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsValue}>{value}</Text>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  avatarEmoji: {
    fontSize: 36,
  },
  editAvatarBadge: {
    position: "absolute",
    bottom: 4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarIcon: {
    fontSize: 12,
  },
  // Name editing
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  name: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  editIcon: {
    fontSize: 14,
  },
  nameEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  nameInput: {
    flex: 1,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  saveButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  email: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  settingsCard: {
    marginBottom: SPACING.lg,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingsLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  settingsValue: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  settingsValueTap: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  signOutButton: {
    marginTop: SPACING.md,
  },
  // Avatar picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  colorGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: COLORS.textPrimary,
    borderWidth: 3,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiOptionSelected: {
    backgroundColor: COLORS.primary + "20",
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  modalPreview: {
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  previewAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewLetter: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
});
