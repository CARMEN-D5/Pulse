/**
 * FriendshipReminders — Shows contacts the user hasn't interacted with in 7+ days.
 * Sorted by longest gap. Tapping a reminder pre-fills the contact name.
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../../../shared/components/Card";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { FriendshipReminder } from "../types/social.types";

interface FriendshipRemindersProps {
  reminders: FriendshipReminder[];
  onReconnect: (contactName: string) => void;
}

export function FriendshipRemindersCard({ reminders, onReconnect }: FriendshipRemindersProps) {
  if (reminders.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Reconnect</Text>
        <Text style={styles.subtitle}>Friends you haven't contacted recently</Text>
      </View>

      {reminders.slice(0, 5).map((reminder) => (
        <TouchableOpacity
          key={reminder.contactName}
          style={styles.reminderRow}
          onPress={() => onReconnect(reminder.contactName)}
          activeOpacity={0.7}
        >
          <View style={styles.reminderAvatar}>
            <Text style={styles.reminderAvatarText}>
              {reminder.contactName[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderName}>{reminder.contactName}</Text>
            <Text style={styles.reminderDays}>
              {reminder.daysSinceContact} days since last contact
            </Text>
          </View>
          <Text style={styles.reminderCta}>Say hi →</Text>
        </TouchableOpacity>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  header: {
    gap: 2,
  },
  title: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reminderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
  },
  reminderAvatarText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  reminderInfo: {
    flex: 1,
    gap: 1,
  },
  reminderName: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  reminderDays: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.warning,
  },
  reminderCta: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
