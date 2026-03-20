/**
 * To-Do / Chore List type definitions.
 */

export type TodoPriority = "low" | "medium" | "high";

export type TodoFilter = "all" | "active" | "completed";

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: TodoPriority;
  /** Optional due date YYYY-MM-DD */
  dueDate: string | null;
  date: string; // YYYY-MM-DD created
  createdAt: string; // ISO
  completedAt: string | null; // ISO
}

export interface PriorityOption {
  value: TodoPriority;
  label: string;
  emoji: string;
  color: string;
}

export const PRIORITY_OPTIONS: PriorityOption[] = [
  { value: "high", label: "High", emoji: "🔴", color: "#EF4444" },
  { value: "medium", label: "Medium", emoji: "🟡", color: "#F59E0B" },
  { value: "low", label: "Low", emoji: "🟢", color: "#22C55E" },
];

export interface TodoStats {
  total: number;
  completed: number;
  percentage: number;
}
