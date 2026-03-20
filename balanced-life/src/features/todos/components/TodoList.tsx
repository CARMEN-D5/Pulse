/**
 * TodoList — Displays tasks with checkbox, priority indicator, and due date.
 * Supports filter (all/active/completed) and delete via long-press.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../config/theme";
import { Card } from "../../../shared/components";
import { EmptyState } from "../../../shared/components/EmptyState";
import { TodoItem, TodoFilter, PRIORITY_OPTIONS } from "../types/todo.types";
import { formatDueDate } from "../services/todoService";

interface Props {
  todos: TodoItem[];
  filter: TodoFilter;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

function getPriorityColor(priority: string): string {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.color ?? COLORS.textMuted;
}

function getPriorityEmoji(priority: string): string {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.emoji ?? "";
}

export function TodoList({ todos, filter, onToggle, onDelete }: Props) {
  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    const messages: Record<TodoFilter, { title: string; msg: string }> = {
      all: {
        title: "No Tasks Yet",
        msg: "Add your first task above to start tracking your to-dos.",
      },
      active: {
        title: "All Done!",
        msg: "You've completed all your tasks. Nice work!",
      },
      completed: {
        title: "No Completed Tasks",
        msg: "Complete a task by tapping the checkbox.",
      },
    };

    return (
      <EmptyState
        icon={filter === "active" ? "🎉" : "📋"}
        title={messages[filter].title}
        message={messages[filter].msg}
        compact
      />
    );
  }

  return (
    <View>
      {filtered.map((todo) => {
        const isOverdue =
          !todo.completed && todo.dueDate != null && todo.dueDate < new Date().toISOString().slice(0, 10);

        return (
          <TouchableOpacity
            key={todo.id}
            activeOpacity={0.7}
            onPress={() => onToggle(todo.id, todo.completed)}
            onLongPress={() => {
              Alert.alert("Delete Task", `Delete "${todo.title}"?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => onDelete(todo.id),
                },
              ]);
            }}
          >
            <Card style={styles.todoCard}>
              <View style={styles.todoRow}>
                {/* Checkbox */}
                <View
                  style={[
                    styles.checkbox,
                    todo.completed && styles.checkboxDone,
                    { borderColor: getPriorityColor(todo.priority) },
                  ]}
                >
                  {todo.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>

                {/* Content */}
                <View style={styles.todoContent}>
                  <Text
                    style={[
                      styles.todoTitle,
                      todo.completed && styles.todoTitleDone,
                    ]}
                    numberOfLines={2}
                  >
                    {todo.title}
                  </Text>

                  <View style={styles.todoMeta}>
                    <Text style={styles.priorityBadge}>
                      {getPriorityEmoji(todo.priority)}
                    </Text>
                    {todo.dueDate && (
                      <Text
                        style={[
                          styles.dueDate,
                          isOverdue && styles.dueDateOverdue,
                        ]}
                      >
                        {formatDueDate(todo.dueDate)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  todoCard: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  todoContent: {
    flex: 1,
    gap: 2,
  },
  todoTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  todoTitleDone: {
    textDecorationLine: "line-through",
    color: COLORS.textMuted,
  },
  todoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  priorityBadge: {
    fontSize: 12,
  },
  dueDate: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  dueDateOverdue: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
