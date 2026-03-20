/**
 * SocialScreen — Log friend/family interactions and see friendship reminders.
 */
import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

import { RootStackParamList } from "../../../shared/types/navigation.types";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { useAuthStore } from "../../auth/stores/authStore";
import { SocialForm } from "../components/SocialForm";
import { SocialHistory } from "../components/SocialHistory";
import { FriendshipRemindersCard } from "../components/FriendshipReminders";
import {
  SocialLogEntry,
  InteractionType,
  KnownContact,
  FriendshipReminder,
} from "../types/social.types";
import {
  logSocialInteraction,
  fetchRecentSocialLogs,
  buildKnownContacts,
  generateFriendshipReminders,
} from "../services/socialService";

export function SocialScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<SocialLogEntry[]>([]);
  const [knownContacts, setKnownContacts] = useState<KnownContact[]>([]);
  const [reminders, setReminders] = useState<FriendshipReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const recent = await fetchRecentSocialLogs(user.uid, 30);
      setLogs(recent);
      const contacts = buildKnownContacts(recent);
      setKnownContacts(contacts);
      setReminders(generateFriendshipReminders(contacts));
    } catch (e) {
      console.warn("Failed to load social logs:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSubmit = async (data: {
    contactName: string;
    interactionType: InteractionType;
    note: string;
  }) => {
    if (!user) return;
    try {
      const entry = await logSocialInteraction(user.uid, data);
      // Optimistic update
      const updated = [entry, ...logs];
      setLogs(updated);
      const contacts = buildKnownContacts(updated);
      setKnownContacts(contacts);
      setReminders(generateFriendshipReminders(contacts));
      Alert.alert("Logged!", `Interaction with ${data.contactName} saved.`);
    } catch (e) {
      Alert.alert("Error", "Failed to save interaction. Please try again.");
    }
  };

  const handleReconnect = (contactName: string) => {
    // Scroll to top where the form is
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    // The form will need the contact name pre-filled — we pass it via knownContacts
    // User taps the quick-select chip for that contact
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Social</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Log form */}
        <SocialForm knownContacts={knownContacts} onSubmit={handleSubmit} />

        {/* Friendship reminders */}
        <FriendshipRemindersCard reminders={reminders} onReconnect={handleReconnect} />

        {/* Weekly stats */}
        {knownContacts.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{knownContacts.length}</Text>
              <Text style={styles.statLabel}>Contacts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{logs.length}</Text>
              <Text style={styles.statLabel}>Interactions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reminders.length}</Text>
              <Text style={styles.statLabel}>Need Catch-up</Text>
            </View>
          </View>
        )}

        {/* History */}
        <SocialHistory logs={logs} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    paddingVertical: SPACING.xs,
  },
  backText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
});
