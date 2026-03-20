/**
 * TodoScreen — Task / Chore list with add form, filter, stats, and task list.
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
import { Card } from "../../../shared/components";
import { TodoItem, TodoPriority, TodoFilter, TodoStats } from "../types/todo.types";
import {
  createTodo,
  toggleTodoComplete,
  deleteTodo,
  fetchTodos,
  sortTodos,
  computeTodoStats,
} from "../services/todoService";
import { TodoForm } from "../components/TodoForm";
import { TodoList } from "../components/TodoList";

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Done" },
];

export function TodoScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [loading, setLoading] = useState(true);

  const stats = computeTodoStats(todos);
  const sorted = sortTodos(todos);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTodos(user.uid);
      setTodos(data);
    } catch (e) {
      console.error("Failed to load todos:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAdd = async (
    title: string,
    priority: TodoPriority,
    dueDate: string | null
  ) => {
    if (!user) return;
    const todo = await createTodo(user.uid, title, priority, dueDate);
    setTodos((prev) => [todo, ...prev]);
  };

  const handleToggle = async (id: string, completed: boolean) => {
    if (!user) return;
    try {
      await toggleTodoComplete(user.uid, id, completed);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                completed: !completed,
                completedAt: !completed ? new Date().toISOString() : null,
              }
            : t
        )
      );
    } catch (e) {
      console.error("Failed to toggle todo:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteTodo(user.uid, id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete todo:", e);
    }
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
          <Text style={styles.title}>To-Do List</Text>
          <View style={{ width: 60 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Stats row */}
            {todos.length > 0 && (
              <Card style={styles.statsCard}>
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: COLORS.primary }]}>
                      {stats.completed}
                    </Text>
                    <Text style={styles.statLabel}>Done</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: "#22C55E" }]}>
                      {stats.percentage}%
                    </Text>
                    <Text style={styles.statLabel}>Complete</Text>
                  </View>
                </View>
                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.max(stats.percentage, 1)}%` as any },
                    ]}
                  />
                </View>
              </Card>
            )}

            {/* Add form */}
            <TodoForm onSubmit={handleAdd} />

            {/* Filter bar */}
            {todos.length > 0 && (
              <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                  const active = filter === f.value;
                  return (
                    <TouchableOpacity
                      key={f.value}
                      style={[styles.filterChip, active && styles.filterChipActive]}
                      onPress={() => setFilter(f.value)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          active && styles.filterTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Task list */}
            <TodoList
              todos={sorted}
              filter={filter}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
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
    marginBottom: SPACING.md,
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
  loadingContainer: {
    paddingVertical: SPACING.xxl * 2,
    alignItems: "center",
  },
  statsCard: {
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.sm,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: FONT_SIZES.title,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
});
