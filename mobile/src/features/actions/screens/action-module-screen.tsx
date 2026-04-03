import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import { TextField } from "@/components/ui/text-field";
import { ACTION_MODULES, isActionModuleKey, type ActionModuleKey } from "@/features/actions/action-modules";
import {
  cancelFocusSession,
  completeTask,
  completeFocusSession,
  createActivityLog,
  createConnectionLog,
  createExpenseLog,
  createFinancialAction,
  deleteConnectionLog,
  deleteExpenseLog,
  deleteFinancialAction,
  deleteFocusSession,
  deleteSleepLog,
  deleteTask,
  createJournalEntry,
  createQuickSleepLog,
  createTask,
  fetchActivityLogs,
  fetchConnectionLogs,
  fetchExpenseLogs,
  fetchFinancialActions,
  fetchFocusSessions,
  fetchJournalEntries,
  fetchSleepLogs,
  fetchTasks,
  startFocusSession,
  updateActivityLog,
  updateConnectionLog,
  updateExpenseLog,
  updateFinancialAction,
  updateJournalEntry,
  updateTask,
  type ActivityLog,
  type ConnectionLog,
  type ExpenseLog,
  type FinancialAction,
  type FocusSession,
  type JournalEntry,
  type SleepLog,
  type Task
} from "@/features/actions/services/action-service";
import { formatTimestampLocal } from "@/lib/date-time";
import { withOfflineHint } from "@/lib/errors";
import { useAuthSession } from "@/providers/auth-session-provider";

export function ActionModuleScreen() {
  const params = useLocalSearchParams<{ module?: string }>();
  const moduleKey = typeof params.module === "string" ? params.module : null;

  if (!moduleKey || !isActionModuleKey(moduleKey)) {
    return (
      <Screen>
        <View style={styles.invalidWrapper}>
          <Text style={styles.invalidTitle}>Unknown action module</Text>
          <Text style={styles.invalidCopy}>
            This route does not match one of the supported V1 action modules.
          </Text>
          <Button onPress={() => router.back()} tone="secondary">
            Back to actions
          </Button>
        </View>
      </Screen>
    );
  }

  switch (moduleKey) {
    case "journal":
      return <JournalModule />;
    case "connection":
      return <ConnectionModule />;
    case "task":
      return <TaskModule />;
    case "focus":
      return <FocusModule />;
    case "activity":
      return <ActivityModule />;
    case "sleep":
      return <SleepModule />;
    case "expense":
      return <ExpenseModule />;
    case "financial":
      return <FinancialActionModule />;
    default:
      return null;
  }
}

function ModuleShell({
  children,
  moduleKey
}: {
  children: React.ReactNode;
  moduleKey: ActionModuleKey;
}) {
  const module = ACTION_MODULES[moduleKey];

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Actions</Text>
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.copy}>{module.description}</Text>
      </View>

      <Button onPress={() => router.back()} tone="ghost">
        Back to actions
      </Button>

      {children}
    </Screen>
  );
}

function EmptyState({ message }: { message: string }) {
  return <StatusCard message={message} title="Nothing here yet" tone="neutral" />;
}

function ErrorBanner({ message }: { message: string | null }) {
  return message ? <StatusCard message={withOfflineHint(message)} title="Action failed" tone="error" /> : null;
}

function SuccessBanner({ message }: { message: string | null }) {
  return message ? <StatusCard message={message} title="Saved to VELORA" tone="success" /> : null;
}

function useEntryActionState() {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  return {
    activeEntryId,
    setActiveEntryId
  };
}

function JournalModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchJournalEntries(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load journal entries.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await createJournalEntry(user.id, {
        body,
        title
      });
      setTitle("");
      setBody("");
      setEditingEntryId(null);
      setSuccessMessage("Journal entry saved.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the journal entry.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (editingEntryId) {
        await updateJournalEntry(user.id, editingEntryId, {
          body,
          title
        });
        setSuccessMessage("Journal entry updated.");
      } else {
        await createJournalEntry(user.id, {
          body,
          title
        });
        setSuccessMessage("Journal entry saved.");
      }

      setTitle("");
      setBody("");
      setEditingEntryId(null);
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? "Unable to update the journal entry."
            : "Unable to save the journal entry."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModuleShell moduleKey="journal">
      <Card>
        <TextField label="Title" onChangeText={setTitle} placeholder="Optional title" value={title} />
        <TextField
          label="Entry"
          multiline
          numberOfLines={6}
          onChangeText={setBody}
          placeholder="Write what you are reflecting on today."
          style={styles.multilineInput}
          textAlignVertical="top"
          value={body}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingEntryId ? "Update journal entry" : "Save journal entry"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent entries</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? (
          <EmptyState message="No journal entries yet." />
        ) : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.title || "Untitled reflection"}</Text>
            <Text style={styles.listCopy}>{entry.body}</Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.occurredAtUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => {
                  setActiveEntryId(entry.id);
                  setTitle(entry.title ?? "");
                  setBody(entry.body);
                  setEditingEntryId(entry.id);
                  setSuccessMessage(null);
                  setErrorMessage(null);
                  setActiveEntryId(null);
                }}
                tone="secondary"
              >
                Edit
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function ConnectionModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<ConnectionLog[]>([]);
  const [connectionType, setConnectionType] = useState("");
  const [contactLabel, setContactLabel] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchConnectionLogs(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load connection logs.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingEntryId) {
        await updateConnectionLog(user.id, editingEntryId, {
          connectionType,
          contactLabel,
          note
        });
        setSuccessMessage("Connection log updated.");
      } else {
        await createConnectionLog(user.id, {
          connectionType,
          contactLabel,
          note
        });
        setSuccessMessage("Connection log saved.");
      }
      setConnectionType("");
      setContactLabel("");
      setNote("");
      setEditingEntryId(null);
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? "Unable to update the connection log."
            : "Unable to save the connection log."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveEntryId(entryId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteConnectionLog(user.id, entryId);
      if (editingEntryId === entryId) {
        setConnectionType("");
        setContactLabel("");
        setNote("");
        setEditingEntryId(null);
      }
      setSuccessMessage("Connection log deleted.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the connection log.");
    } finally {
      setActiveEntryId(null);
    }
  }

  return (
    <ModuleShell moduleKey="connection">
      <Card>
        <TextField
          label="Connection type"
          onChangeText={setConnectionType}
          placeholder="Coffee, call, dinner, walk..."
          value={connectionType}
        />
        <TextField
          label="Contact label"
          onChangeText={setContactLabel}
          placeholder="Friend, sibling, mentor..."
          value={contactLabel}
        />
        <TextField
          label="Note"
          multiline
          numberOfLines={4}
          onChangeText={setNote}
          placeholder="Anything meaningful you want to remember."
          style={styles.multilineInput}
          textAlignVertical="top"
          value={note}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingEntryId ? "Update connection log" : "Save connection log"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent connection logs</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? (
          <EmptyState message="No connection logs yet." />
        ) : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>
              {entry.connectionType || entry.contactLabel || "Meaningful connection"}
            </Text>
            <Text style={styles.listCopy}>
              {[entry.contactLabel, entry.note].filter(Boolean).join(" • ") || "No extra note"}
            </Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.occurredAtUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => {
                  setConnectionType(entry.connectionType ?? "");
                  setContactLabel(entry.contactLabel ?? "");
                  setNote(entry.note ?? "");
                  setEditingEntryId(entry.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                tone="secondary"
              >
                Edit
              </Button>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => void handleDelete(entry.id)}
                tone="ghost"
              >
                Delete
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function TaskModule() {
  const { user } = useAuthSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    void loadTasks();
  }, [user?.id]);

  async function loadTasks() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setTasks(await fetchTasks(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingTaskId) {
        await updateTask(user.id, editingTaskId, {
          notes,
          title
        });
        setSuccessMessage("Task updated.");
      } else {
        await createTask(user.id, {
          notes,
          title
        });
        setSuccessMessage("Task created.");
      }
      setTitle("");
      setNotes("");
      setEditingTaskId(null);
      await loadTasks();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingTaskId
            ? "Unable to update the task."
            : "Unable to create the task."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete(taskId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await completeTask(user.id, taskId);
      setSuccessMessage("Task completed.");
      await loadTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete the task.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleDelete(taskId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setUpdatingTaskId(taskId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteTask(user.id, taskId);
      if (editingTaskId === taskId) {
        setTitle("");
        setNotes("");
        setEditingTaskId(null);
      }
      setSuccessMessage("Task deleted.");
      await loadTasks();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the task.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <ModuleShell moduleKey="task">
      <Card>
        <TextField label="Task title" onChangeText={setTitle} placeholder="Finish assignment outline" value={title} />
        <TextField
          label="Notes"
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          placeholder="Optional context"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={notes}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingTaskId ? "Update task" : "Create task"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Task list</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !tasks.length ? <EmptyState message="No tasks yet." /> : null}
        {tasks.map((task) => (
          <View key={task.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{task.title}</Text>
            {task.notes ? <Text style={styles.listCopy}>{task.notes}</Text> : null}
            <Text style={styles.listMeta}>
              {task.status === "completed"
                ? `Completed ${task.completedAtUtc ? formatTimestampLocal(task.completedAtUtc) : ""}`
                : `Status: ${task.status}`}
            </Text>
            <View style={styles.inlineActions}>
              {task.status === "pending" ? (
                <>
                  <Button
                    loading={updatingTaskId === task.id}
                    onPress={() => void handleComplete(task.id)}
                    tone="secondary"
                  >
                    Mark complete
                  </Button>
                  <Button
                    loading={updatingTaskId === task.id}
                    onPress={() => {
                      setTitle(task.title);
                      setNotes(task.notes ?? "");
                      setEditingTaskId(task.id);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    tone="ghost"
                  >
                    Edit
                  </Button>
                </>
              ) : null}
              {task.status !== "completed" ? (
                <Button
                  loading={updatingTaskId === task.id}
                  onPress={() => void handleDelete(task.id)}
                  tone="ghost"
                >
                  Delete
                </Button>
              ) : null}
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function FocusModule() {
  const { user } = useAuthSession();
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    void loadSessions();
  }, [user?.id]);

  async function loadSessions() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setSessions(await fetchFocusSessions(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load focus sessions.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStart() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await startFocusSession(user.id);
      setSuccessMessage("Focus session started.");
      await loadSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start a focus session.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComplete(sessionId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveSessionId(sessionId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await completeFocusSession(user.id, sessionId);
      setSuccessMessage("Focus session completed.");
      await loadSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete the focus session.");
    } finally {
      setActiveSessionId(null);
    }
  }

  async function handleCancel(sessionId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveSessionId(sessionId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await cancelFocusSession(user.id, sessionId);
      setSuccessMessage("Focus session cancelled.");
      await loadSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to cancel the focus session.");
    } finally {
      setActiveSessionId(null);
    }
  }

  async function handleDelete(sessionId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveSessionId(sessionId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteFocusSession(user.id, sessionId);
      setSuccessMessage("Focus session deleted.");
      await loadSessions();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the focus session.");
    } finally {
      setActiveSessionId(null);
    }
  }

  return (
    <ModuleShell moduleKey="focus">
      <Card>
        <Text style={styles.helper}>
          Start a session when you begin focused work. Complete it when you finish so the backend can
          normalize it into score events.
        </Text>
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleStart}>
          Start focus session
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Sessions</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !sessions.length ? <EmptyState message="No focus sessions yet." /> : null}
        {sessions.map((session) => (
          <View key={session.id} style={styles.listItem}>
            <Text style={styles.listTitle}>
              {session.status === "completed" ? "Completed session" : "Open session"}
            </Text>
            <Text style={styles.listCopy}>
              Started {formatTimestampLocal(session.startedAtUtc)}
              {session.durationMinutes ? ` • ${session.durationMinutes} min` : ""}
            </Text>
            {session.status === "in_progress" ? (
              <View style={styles.inlineActions}>
                <Button
                  loading={activeSessionId === session.id}
                  onPress={() => void handleComplete(session.id)}
                  tone="secondary"
                >
                  Complete
                </Button>
                <Button
                  loading={activeSessionId === session.id}
                  onPress={() => void handleCancel(session.id)}
                  tone="ghost"
                >
                  Cancel
                </Button>
                <Button
                  loading={activeSessionId === session.id}
                  onPress={() => void handleDelete(session.id)}
                  tone="ghost"
                >
                  Delete
                </Button>
              </View>
            ) : (
              <View style={styles.inlineActions}>
                <Text style={styles.listMeta}>Status: {session.status}</Text>
                <Button
                  loading={activeSessionId === session.id}
                  onPress={() => void handleDelete(session.id)}
                  tone="ghost"
                >
                  Delete
                </Button>
              </View>
            )}
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function ActivityModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [activityType, setActivityType] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchActivityLogs(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load activity logs.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingEntryId) {
        await updateActivityLog(user.id, editingEntryId, {
          activityType,
          distanceKm,
          durationMinutes,
          notes
        });
        setSuccessMessage("Activity log updated.");
      } else {
        await createActivityLog(user.id, {
          activityType,
          distanceKm,
          durationMinutes,
          notes
        });
        setSuccessMessage("Activity logged.");
      }
      setActivityType("");
      setDurationMinutes("");
      setDistanceKm("");
      setNotes("");
      setEditingEntryId(null);
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? "Unable to update the activity log."
            : "Unable to save the activity log."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ModuleShell moduleKey="activity">
      <Card>
        <TextField
          label="Activity type"
          onChangeText={setActivityType}
          placeholder="Run, gym, walk, yoga..."
          value={activityType}
        />
        <TextField
          keyboardType="numeric"
          label="Duration (minutes)"
          onChangeText={setDurationMinutes}
          placeholder="Optional"
          value={durationMinutes}
        />
        <TextField
          keyboardType="decimal-pad"
          label="Distance (km)"
          onChangeText={setDistanceKm}
          placeholder="Optional"
          value={distanceKm}
        />
        <TextField
          label="Notes"
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          placeholder="Optional activity notes"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={notes}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingEntryId ? "Update activity log" : "Save activity log"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent activity logs</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? <EmptyState message="No activity logs yet." /> : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.activityType}</Text>
            <Text style={styles.listCopy}>
              {[entry.durationMinutes ? `${entry.durationMinutes} min` : null, entry.distanceKm ? `${entry.distanceKm} km` : null]
                .filter(Boolean)
                .join(" • ") || "No duration or distance"}
            </Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.occurredAtUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => {
                  setActivityType(entry.activityType);
                  setDurationMinutes(entry.durationMinutes ? String(entry.durationMinutes) : "");
                  setDistanceKm(entry.distanceKm ? String(entry.distanceKm) : "");
                  setNotes(entry.notes ?? "");
                  setEditingEntryId(entry.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                tone="secondary"
              >
                Edit
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function SleepModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<SleepLog[]>([]);
  const [sleepHours, setSleepHours] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchSleepLogs(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load sleep logs.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await createQuickSleepLog(user.id, {
        notes,
        sleepHours
      });
      setSleepHours("");
      setNotes("");
      setSuccessMessage("Sleep log saved using the current time as the wake time.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the sleep log.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveEntryId(entryId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteSleepLog(user.id, entryId);
      setSuccessMessage("Sleep log deleted.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the sleep log.");
    } finally {
      setActiveEntryId(null);
    }
  }

  return (
    <ModuleShell moduleKey="sleep">
      <Card>
        <Text style={styles.helper}>
          V1 quick sleep logging uses the current time as the wake time and works backward from the
          number of hours you enter.
        </Text>
        <TextField
          keyboardType="decimal-pad"
          label="Hours slept"
          onChangeText={setSleepHours}
          placeholder="7.5"
          value={sleepHours}
        />
        <TextField
          label="Notes"
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          placeholder="Optional sleep notes"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={notes}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleCreate}>
          Save sleep log
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent sleep logs</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? <EmptyState message="No sleep logs yet." /> : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>
              {(entry.durationMinutes / 60).toFixed(1)} hours
            </Text>
            <Text style={styles.listCopy}>{entry.notes || "No extra notes"}</Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.sleepEndUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => void handleDelete(entry.id)}
                tone="ghost"
              >
                Delete
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function ExpenseModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<ExpenseLog[]>([]);
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("AUD");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchExpenseLogs(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load expense logs.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingEntryId) {
        await updateExpenseLog(user.id, editingEntryId, {
          amount,
          category,
          currencyCode,
          note
        });
        setSuccessMessage("Expense log updated.");
      } else {
        await createExpenseLog(user.id, {
          amount,
          category,
          currencyCode,
          note
        });
        setSuccessMessage("Expense log saved.");
      }
      setAmount("");
      setCategory("");
      setNote("");
      setEditingEntryId(null);
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? "Unable to update the expense log."
            : "Unable to save the expense log."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveEntryId(entryId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteExpenseLog(user.id, entryId);
      if (editingEntryId === entryId) {
        setAmount("");
        setCategory("");
        setNote("");
        setEditingEntryId(null);
      }
      setSuccessMessage("Expense log deleted.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the expense log.");
    } finally {
      setActiveEntryId(null);
    }
  }

  return (
    <ModuleShell moduleKey="expense">
      <Card>
        <TextField keyboardType="decimal-pad" label="Amount" onChangeText={setAmount} placeholder="12.50" value={amount} />
        <TextField
          autoCapitalize="characters"
          label="Currency code"
          onChangeText={setCurrencyCode}
          placeholder="AUD"
          value={currencyCode}
        />
        <TextField
          label="Category"
          onChangeText={setCategory}
          placeholder="Food, transport, books..."
          value={category}
        />
        <TextField
          label="Note"
          multiline
          numberOfLines={4}
          onChangeText={setNote}
          placeholder="Optional note"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={note}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingEntryId ? "Update expense log" : "Save expense log"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent expense logs</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? <EmptyState message="No expense logs yet." /> : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>
              {entry.currencyCode} {entry.amount.toFixed(2)} • {entry.category}
            </Text>
            <Text style={styles.listCopy}>{entry.note || "No note"}</Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.occurredAtUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => {
                  setAmount(String(entry.amount));
                  setCurrencyCode(entry.currencyCode);
                  setCategory(entry.category);
                  setNote(entry.note ?? "");
                  setEditingEntryId(entry.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                tone="secondary"
              >
                Edit
              </Button>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => void handleDelete(entry.id)}
                tone="ghost"
              >
                Delete
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

function FinancialActionModule() {
  const { user } = useAuthSession();
  const [entries, setEntries] = useState<FinancialAction[]>([]);
  const [actionKind, setActionKind] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const { activeEntryId, setActiveEntryId } = useEntryActionState();

  useEffect(() => {
    void loadEntries();
  }, [user?.id]);

  async function loadEntries() {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setEntries(await fetchFinancialActions(user.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load financial actions.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (editingEntryId) {
        await updateFinancialAction(user.id, editingEntryId, {
          actionKind,
          amount,
          note
        });
        setSuccessMessage("Financial action updated.");
      } else {
        await createFinancialAction(user.id, {
          actionKind,
          amount,
          note
        });
        setSuccessMessage("Financial action saved.");
      }
      setActionKind("");
      setAmount("");
      setNote("");
      setEditingEntryId(null);
      await loadEntries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingEntryId
            ? "Unable to update the financial action."
            : "Unable to save the financial action."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!user?.id) {
      return;
    }

    try {
      setActiveEntryId(entryId);
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteFinancialAction(user.id, entryId);
      if (editingEntryId === entryId) {
        setActionKind("");
        setAmount("");
        setNote("");
        setEditingEntryId(null);
      }
      setSuccessMessage("Financial action deleted.");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the financial action.");
    } finally {
      setActiveEntryId(null);
    }
  }

  return (
    <ModuleShell moduleKey="financial">
      <Card>
        <TextField
          label="Action kind"
          onChangeText={setActionKind}
          placeholder="Budget review, savings transfer..."
          value={actionKind}
        />
        <TextField keyboardType="decimal-pad" label="Amount" onChangeText={setAmount} placeholder="Optional" value={amount} />
        <TextField
          label="Note"
          multiline
          numberOfLines={4}
          onChangeText={setNote}
          placeholder="Optional note"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={note}
        />
        <ErrorBanner message={errorMessage} />
        <SuccessBanner message={successMessage} />
        <Button loading={isSaving} onPress={handleSave}>
          {editingEntryId ? "Update financial action" : "Save financial action"}
        </Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent financial actions</Text>
        {isLoading ? <ActivityIndicator color="#8ba3ff" /> : null}
        {!isLoading && !entries.length ? <EmptyState message="No financial actions yet." /> : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.actionKind}</Text>
            <Text style={styles.listCopy}>
              {entry.amount != null ? `$${entry.amount.toFixed(2)}` : "No amount"} • {entry.note || "No note"}
            </Text>
            <Text style={styles.listMeta}>{formatTimestampLocal(entry.occurredAtUtc)}</Text>
            <View style={styles.inlineActions}>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => {
                  setActionKind(entry.actionKind);
                  setAmount(entry.amount != null ? String(entry.amount) : "");
                  setNote(entry.note ?? "");
                  setEditingEntryId(entry.id);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                tone="secondary"
              >
                Edit
              </Button>
              <Button
                loading={activeEntryId === entry.id}
                onPress={() => void handleDelete(entry.id)}
                tone="ghost"
              >
                Delete
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </ModuleShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 16
  },
  eyebrow: {
    color: "#8ba3ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  copy: {
    color: "#bcc6df",
    fontSize: 16,
    lineHeight: 24
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  multilineInput: {
    minHeight: 120
  },
  helper: {
    color: "#a7b2cd",
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  },
  success: {
    color: "#a9f2c2",
    fontSize: 14,
    lineHeight: 20
  },
  listItem: {
    gap: 6,
    paddingVertical: 6
  },
  listTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  listCopy: {
    color: "#d0d8ee",
    fontSize: 14,
    lineHeight: 20
  },
  listMeta: {
    color: "#8f99b3",
    fontSize: 13
  },
  inlineActions: {
    flexDirection: "row",
    gap: 10
  },
  invalidWrapper: {
    flex: 1,
    gap: 16,
    justifyContent: "center"
  },
  invalidTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700"
  },
  invalidCopy: {
    color: "#b9c3de",
    fontSize: 16,
    lineHeight: 24
  }
});
