/**
 * JournalScreen — Guided journaling with prompts, mood tagging, and history.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { useAuthStore } from "../../../features/auth/stores/authStore";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { JournalEntry, JournalMood } from "../types/journal.types";
import {
  createJournalEntry,
  fetchJournalEntries,
} from "../services/journalService";
import { JournalForm } from "../components/JournalForm";
import { JournalHistory } from "../components/JournalHistory";

export function JournalScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchJournalEntries(user.uid);
      setEntries(data);
    } catch (e) {
      console.error("Failed to load journal entries:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSubmit = async (
    title: string,
    body: string,
    promptId: string | null,
    mood: JournalMood | null
  ) => {
    if (!user) return;
    const entry = await createJournalEntry(user.uid, title, body, promptId, mood);
    setEntries((prev) => [entry, ...prev]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Journal</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>
          Reflect on your day and track how you feel
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* New entry form */}
            <JournalForm onSubmit={handleSubmit} />

            {/* Entry count */}
            {entries.length > 0 && (
              <Text style={styles.entryCount}>
                {entries.length} entr{entries.length === 1 ? "y" : "ies"}
              </Text>
            )}

            {/* History */}
            <JournalHistory entries={entries} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  backButton: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: "600",
    minWidth: 60,
  },
  title: {
    fontSize: FONT_SIZES.title,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: "center",
  },
  entryCount: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
});
