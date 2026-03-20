/**
 * ActivityScreen — Log physical activities and view history.
 */
import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { RootStackParamList } from "../../../shared/types/navigation.types";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { useAuthStore } from "../../auth/stores/authStore";
import { ActivityForm } from "../components/ActivityForm";
import { ActivityHistory } from "../components/ActivityHistory";
import { ActivityEntry, ActivityType, Intensity } from "../types/activity.types";
import {
  logActivity,
  fetchRecentActivities,
  fetchActivitiesInRange,
} from "../services/activityService";
import { TouchableOpacity } from "react-native";

/** Get Monday of the current week as YYYY-MM-DD */
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ActivityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [thisWeekActivities, setThisWeekActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recent, weekly] = await Promise.all([
        fetchRecentActivities(user.uid, 20),
        fetchActivitiesInRange(user.uid, getWeekStart(), getTodayStr()),
      ]);
      setActivities(recent);
      setThisWeekActivities(weekly);
    } catch (e) {
      console.warn("Failed to load activities:", e);
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
    type: ActivityType;
    duration: number;
    intensity: Intensity;
    note: string;
  }) => {
    if (!user) return;
    try {
      const entry = await logActivity(user.uid, data);
      // Optimistic update — add to top of list
      setActivities((prev) => [entry, ...prev]);
      setThisWeekActivities((prev) => [entry, ...prev]);
      Alert.alert("Logged!", `${data.duration} min activity saved.`);
    } catch (e) {
      Alert.alert("Error", "Failed to save activity. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Log form */}
        <ActivityForm onSubmit={handleSubmit} />

        {/* History + stats */}
        <ActivityHistory
          activities={activities}
          thisWeekActivities={thisWeekActivities}
        />
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
});
