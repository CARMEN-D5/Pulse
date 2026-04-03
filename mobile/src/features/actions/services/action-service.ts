import { supabase } from "@/lib/supabase/client";

function ensureText(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("Please enter a valid positive whole number.");
  }

  return parsed;
}

function parseOptionalDecimal(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Please enter a valid positive number.");
  }

  return parsed;
}

type JournalEntryRow = {
  body: string;
  created_at: string;
  id: string;
  local_event_date: string;
  occurred_at_utc: string;
  title: string | null;
};

export type JournalEntry = {
  body: string;
  createdAt: string;
  id: string;
  localEventDate: string;
  occurredAtUtc: string;
  title: string | null;
};

export async function fetchJournalEntries(userId: string) {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, title, body, occurred_at_utc, local_event_date, created_at")
    .eq("user_id", userId)
    .order("occurred_at_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as JournalEntryRow[] | null)?.map((row) => ({
    body: row.body,
    createdAt: row.created_at,
    id: row.id,
    localEventDate: row.local_event_date,
    occurredAtUtc: row.occurred_at_utc,
    title: row.title
  })) ?? [];
}

export async function createJournalEntry(userId: string, input: { body: string; title: string }) {
  const { error } = await supabase.from("journal_entries").insert({
    body: ensureText(input.body, "Entry"),
    title: input.title.trim() || null,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateJournalEntry(
  userId: string,
  entryId: string,
  input: { body: string; title: string }
) {
  const { error } = await supabase
    .from("journal_entries")
    .update({
      body: ensureText(input.body, "Entry"),
      title: input.title.trim() || null
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type ConnectionLogRow = {
  connection_type: string | null;
  contact_label: string | null;
  id: string;
  note: string | null;
  occurred_at_utc: string;
};

export type ConnectionLog = {
  connectionType: string | null;
  contactLabel: string | null;
  id: string;
  note: string | null;
  occurredAtUtc: string;
};

export async function fetchConnectionLogs(userId: string) {
  const { data, error } = await supabase
    .from("connection_logs")
    .select("id, connection_type, contact_label, note, occurred_at_utc")
    .eq("user_id", userId)
    .order("occurred_at_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as ConnectionLogRow[] | null)?.map((row) => ({
    connectionType: row.connection_type,
    contactLabel: row.contact_label,
    id: row.id,
    note: row.note,
    occurredAtUtc: row.occurred_at_utc
  })) ?? [];
}

export async function createConnectionLog(
  userId: string,
  input: { connectionType: string; contactLabel: string; note: string }
) {
  const { error } = await supabase.from("connection_logs").insert({
    connection_type: input.connectionType.trim() || null,
    contact_label: input.contactLabel.trim() || null,
    note: input.note.trim() || null,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateConnectionLog(
  userId: string,
  entryId: string,
  input: { connectionType: string; contactLabel: string; note: string }
) {
  const { error } = await supabase
    .from("connection_logs")
    .update({
      connection_type: input.connectionType.trim() || null,
      contact_label: input.contactLabel.trim() || null,
      note: input.note.trim() || null
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteConnectionLog(userId: string, entryId: string) {
  const { error } = await supabase
    .from("connection_logs")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type TaskRow = {
  completed_at_utc: string | null;
  id: string;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  title: string;
  updated_at: string;
};

export type Task = {
  completedAtUtc: string | null;
  id: string;
  notes: string | null;
  status: "pending" | "completed" | "cancelled";
  title: string;
  updatedAt: string;
};

export async function fetchTasks(userId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, notes, status, completed_at_utc, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data as TaskRow[] | null)?.map((row) => ({
    completedAtUtc: row.completed_at_utc,
    id: row.id,
    notes: row.notes,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at
  })) ?? [];
}

export async function createTask(userId: string, input: { notes: string; title: string }) {
  const { error } = await supabase.from("tasks").insert({
    notes: input.notes.trim() || null,
    title: ensureText(input.title, "Task title"),
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: { notes: string; title: string }
) {
  const { error } = await supabase
    .from("tasks")
    .update({
      notes: input.notes.trim() || null,
      title: ensureText(input.title, "Task title")
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function completeTask(userId: string, taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed"
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteTask(userId: string, taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type FocusSessionRow = {
  duration_minutes: number | null;
  id: string;
  started_at_utc: string;
  status: "in_progress" | "completed" | "cancelled";
};

export type FocusSession = {
  durationMinutes: number | null;
  id: string;
  startedAtUtc: string;
  status: "in_progress" | "completed" | "cancelled";
};

export async function fetchFocusSessions(userId: string) {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("id, started_at_utc, duration_minutes, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return (data as FocusSessionRow[] | null)?.map((row) => ({
    durationMinutes: row.duration_minutes,
    id: row.id,
    startedAtUtc: row.started_at_utc,
    status: row.status
  })) ?? [];
}

export async function startFocusSession(userId: string) {
  const { error } = await supabase.from("focus_sessions").insert({
    started_at_utc: new Date().toISOString(),
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

async function updateFocusSessionStatus(
  userId: string,
  sessionId: string,
  status: "completed" | "cancelled"
) {
  const { error } = await supabase
    .from("focus_sessions")
    .update({
      status
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function completeFocusSession(userId: string, sessionId: string) {
  await updateFocusSessionStatus(userId, sessionId, "completed");
}

export async function cancelFocusSession(userId: string, sessionId: string) {
  await updateFocusSessionStatus(userId, sessionId, "cancelled");
}

export async function deleteFocusSession(userId: string, sessionId: string) {
  const { error } = await supabase
    .from("focus_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type ActivityLogRow = {
  activity_type: string;
  distance_km: number | null;
  duration_minutes: number | null;
  id: string;
  notes: string | null;
  occurred_at_utc: string;
};

export type ActivityLog = {
  activityType: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  id: string;
  notes: string | null;
  occurredAtUtc: string;
};

export async function fetchActivityLogs(userId: string) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, activity_type, duration_minutes, distance_km, notes, occurred_at_utc")
    .eq("user_id", userId)
    .order("occurred_at_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as ActivityLogRow[] | null)?.map((row) => ({
    activityType: row.activity_type,
    distanceKm: row.distance_km,
    durationMinutes: row.duration_minutes,
    id: row.id,
    notes: row.notes,
    occurredAtUtc: row.occurred_at_utc
  })) ?? [];
}

export async function createActivityLog(
  userId: string,
  input: { activityType: string; distanceKm: string; durationMinutes: string; notes: string }
) {
  const { error } = await supabase.from("activity_logs").insert({
    activity_type: ensureText(input.activityType, "Activity type"),
    distance_km: parseOptionalDecimal(input.distanceKm),
    duration_minutes: parseOptionalInteger(input.durationMinutes),
    notes: input.notes.trim() || null,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateActivityLog(
  userId: string,
  entryId: string,
  input: { activityType: string; distanceKm: string; durationMinutes: string; notes: string }
) {
  const { error } = await supabase
    .from("activity_logs")
    .update({
      activity_type: ensureText(input.activityType, "Activity type"),
      distance_km: parseOptionalDecimal(input.distanceKm),
      duration_minutes: parseOptionalInteger(input.durationMinutes),
      notes: input.notes.trim() || null
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type SleepLogRow = {
  duration_minutes: number;
  id: string;
  notes: string | null;
  sleep_end_utc: string;
};

export type SleepLog = {
  durationMinutes: number;
  id: string;
  notes: string | null;
  sleepEndUtc: string;
};

export async function fetchSleepLogs(userId: string) {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("id, duration_minutes, notes, sleep_end_utc")
    .eq("user_id", userId)
    .order("sleep_end_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as SleepLogRow[] | null)?.map((row) => ({
    durationMinutes: row.duration_minutes,
    id: row.id,
    notes: row.notes,
    sleepEndUtc: row.sleep_end_utc
  })) ?? [];
}

export async function createQuickSleepLog(
  userId: string,
  input: { notes: string; sleepHours: string }
) {
  const sleepHours = parseOptionalDecimal(input.sleepHours);

  if (sleepHours == null) {
    throw new Error("Hours slept is required.");
  }

  const sleepEnd = new Date();
  const sleepStart = new Date(sleepEnd.getTime() - sleepHours * 60 * 60 * 1000);

  const { error } = await supabase.from("sleep_logs").insert({
    notes: input.notes.trim() || null,
    sleep_end_utc: sleepEnd.toISOString(),
    sleep_start_utc: sleepStart.toISOString(),
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function deleteSleepLog(userId: string, entryId: string) {
  const { error } = await supabase
    .from("sleep_logs")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type ExpenseLogRow = {
  amount: number;
  category: string;
  currency_code: string;
  id: string;
  note: string | null;
  occurred_at_utc: string;
};

export type ExpenseLog = {
  amount: number;
  category: string;
  currencyCode: string;
  id: string;
  note: string | null;
  occurredAtUtc: string;
};

export async function fetchExpenseLogs(userId: string) {
  const { data, error } = await supabase
    .from("expense_logs")
    .select("id, amount, currency_code, category, note, occurred_at_utc")
    .eq("user_id", userId)
    .order("occurred_at_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as ExpenseLogRow[] | null)?.map((row) => ({
    amount: Number(row.amount),
    category: row.category,
    currencyCode: row.currency_code,
    id: row.id,
    note: row.note,
    occurredAtUtc: row.occurred_at_utc
  })) ?? [];
}

export async function createExpenseLog(
  userId: string,
  input: { amount: string; category: string; currencyCode: string; note: string }
) {
  const amount = parseOptionalDecimal(input.amount);

  if (amount == null) {
    throw new Error("Amount is required.");
  }

  const { error } = await supabase.from("expense_logs").insert({
    amount,
    category: ensureText(input.category, "Category"),
    currency_code: ensureText(input.currencyCode, "Currency code").toUpperCase(),
    note: input.note.trim() || null,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateExpenseLog(
  userId: string,
  entryId: string,
  input: { amount: string; category: string; currencyCode: string; note: string }
) {
  const amount = parseOptionalDecimal(input.amount);

  if (amount == null) {
    throw new Error("Amount is required.");
  }

  const { error } = await supabase
    .from("expense_logs")
    .update({
      amount,
      category: ensureText(input.category, "Category"),
      currency_code: ensureText(input.currencyCode, "Currency code").toUpperCase(),
      note: input.note.trim() || null
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteExpenseLog(userId: string, entryId: string) {
  const { error } = await supabase
    .from("expense_logs")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

type FinancialActionRow = {
  action_kind: string;
  amount: number | null;
  id: string;
  note: string | null;
  occurred_at_utc: string;
};

export type FinancialAction = {
  actionKind: string;
  amount: number | null;
  id: string;
  note: string | null;
  occurredAtUtc: string;
};

export async function fetchFinancialActions(userId: string) {
  const { data, error } = await supabase
    .from("financial_actions")
    .select("id, action_kind, amount, note, occurred_at_utc")
    .eq("user_id", userId)
    .order("occurred_at_utc", { ascending: false })
    .limit(10);

  if (error) {
    throw error;
  }

  return (data as FinancialActionRow[] | null)?.map((row) => ({
    actionKind: row.action_kind,
    amount: row.amount == null ? null : Number(row.amount),
    id: row.id,
    note: row.note,
    occurredAtUtc: row.occurred_at_utc
  })) ?? [];
}

export async function createFinancialAction(
  userId: string,
  input: { actionKind: string; amount: string; note: string }
) {
  const { error } = await supabase.from("financial_actions").insert({
    action_kind: ensureText(input.actionKind, "Action kind"),
    amount: parseOptionalDecimal(input.amount),
    note: input.note.trim() || null,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function updateFinancialAction(
  userId: string,
  entryId: string,
  input: { actionKind: string; amount: string; note: string }
) {
  const { error } = await supabase
    .from("financial_actions")
    .update({
      action_kind: ensureText(input.actionKind, "Action kind"),
      amount: parseOptionalDecimal(input.amount),
      note: input.note.trim() || null
    })
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function deleteFinancialAction(userId: string, entryId: string) {
  const { error } = await supabase
    .from("financial_actions")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
