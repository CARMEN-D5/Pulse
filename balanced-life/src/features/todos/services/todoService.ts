/**
 * Todo Service — Firestore CRUD for tasks/chores.
 * Collection: users/{uid}/todos/{id}
 */
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { TodoItem, TodoPriority, TodoStats } from "../types/todo.types";

function todoCollection(userId: string) {
  return collection(db, "users", userId, "todos");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Create ──

export async function createTodo(
  userId: string,
  title: string,
  priority: TodoPriority,
  dueDate: string | null
): Promise<TodoItem> {
  const now = new Date();
  const entry: Omit<TodoItem, "id"> = {
    title: title.trim(),
    completed: false,
    priority,
    dueDate,
    date: todayStr(),
    createdAt: now.toISOString(),
    completedAt: null,
  };

  const ref = await addDoc(todoCollection(userId), entry);
  return { id: ref.id, ...entry };
}

// ── Toggle complete ──

export async function toggleTodoComplete(
  userId: string,
  todoId: string,
  currentlyCompleted: boolean
): Promise<void> {
  const ref = doc(db, "users", userId, "todos", todoId);
  await updateDoc(ref, {
    completed: !currentlyCompleted,
    completedAt: !currentlyCompleted ? new Date().toISOString() : null,
  });
}

// ── Delete ──

export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<void> {
  const ref = doc(db, "users", userId, "todos", todoId);
  await deleteDoc(ref);
}

// ── Fetch all ──

export async function fetchTodos(userId: string): Promise<TodoItem[]> {
  const q = query(todoCollection(userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TodoItem));
}

// ── Sort: incomplete first, then priority (high→low), then due date ──

const PRIORITY_ORDER: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTodos(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    // Incomplete first
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    // Then by priority
    const pa = PRIORITY_ORDER[a.priority];
    const pb = PRIORITY_ORDER[b.priority];
    if (pa !== pb) return pa - pb;
    // Then by due date (soonest first, null last)
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    // Then newest first
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// ── Stats ──

export function computeTodoStats(todos: TodoItem[]): TodoStats {
  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ── Format due date ──

export function formatDueDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "Today";

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  if (dateStr === tomorrowStr) return "Tomorrow";
  if (dateStr < today) return "Overdue";

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}
