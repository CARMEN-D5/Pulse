/**
 * ActivitiesScreen — Hub for all user actions and feature entry points.
 * Daily Check-In, Weekly Missions, Weekly Review, Log Activity, Social Log, Budget.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../config/theme";
import { Card } from "../../shared/components";
import { RootStackParamList, MainTabParamList } from "../../shared/types/navigation.types";

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Activities">,
  NativeStackNavigationProp<RootStackParamList>
>;

interface ActionItem {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: (nav: Nav) => void;
}

const DAILY_ACTIONS: ActionItem[] = [
  {
    emoji: "✅",
    title: "Daily Check-In",
    subtitle: "Rate your 5 life domains",
    color: "#2E75B6",
    onPress: (nav) => nav.navigate("CheckIn"),
  },
  {
    emoji: "🏃",
    title: "Log Activity",
    subtitle: "Track physical exercise",
    color: "#EF4444",
    onPress: (nav) => nav.navigate("Activity"),
  },
  {
    emoji: "👋",
    title: "Social Log",
    subtitle: "Log friend & family connections",
    color: "#F59E0B",
    onPress: (nav) => nav.navigate("Friends"),
  },
  {
    emoji: "📝",
    title: "Journal",
    subtitle: "Reflect with guided prompts",
    color: "#6366F1",
    onPress: (nav) => nav.navigate("Journal"),
  },
  {
    emoji: "💰",
    title: "Budget",
    subtitle: "Track income & expenses",
    color: "#10B981",
    onPress: (nav) => nav.navigate("Budget"),
  },
  {
    emoji: "📋",
    title: "To-Do List",
    subtitle: "Manage tasks & chores",
    color: "#3B82F6",
    onPress: (nav) => nav.navigate("Todos"),
  },
];

const WEEKLY_ACTIONS: ActionItem[] = [
  {
    emoji: "🎯",
    title: "Weekly Missions",
    subtitle: "Personalised micro actions",
    color: "#8B5CF6",
    onPress: (nav) => nav.navigate("Missions" as any),
  },
  {
    emoji: "📋",
    title: "Weekly Review",
    subtitle: "See how your week went",
    color: "#3B82F6",
    onPress: (nav) => nav.navigate("WeeklyReview"),
  },
];

function ActionCard({ item, navigation }: { item: ActionItem; navigation: Nav }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => item.onPress(navigation)}
    >
      <Card style={styles.actionCard}>
        <View style={[styles.actionIcon, { backgroundColor: item.color + "15" }]}>
          <Text style={styles.actionEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.actionInfo}>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Card>
    </TouchableOpacity>
  );
}

export function ActivitiesScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Activities</Text>
        <Text style={styles.subtitle}>Track and improve your daily life</Text>

        {/* Daily Actions */}
        <Text style={styles.sectionTitle}>Daily</Text>
        {DAILY_ACTIONS.map((item) => (
          <ActionCard key={item.title} item={item} navigation={navigation} />
        ))}

        {/* Weekly Actions */}
        <Text style={styles.sectionTitle}>Weekly</Text>
        {WEEKLY_ACTIONS.map((item) => (
          <ActionCard key={item.title} item={item} navigation={navigation} />
        ))}
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
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  actionArrow: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textMuted,
  },
});
