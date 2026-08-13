import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import DateField from '../components/DateField';
import Icon from '../components/Icon';
import SegmentedField from '../components/SegmentedField';
import { Alert, Loading, PrimaryButton, Screen, ScreenHeader } from '../components/ui';
import { db } from '../firebase';
import { logAction } from '../firestore/scoring';
import { todayKey } from '../firestore/social';
import { useSharePrompt, ShareButton } from '../components/share';
import { colors, fonts, radius, shadow, spacing, type } from '../theme';
import { confirm } from '../utils/dialogs';

/**
 * Returns true if the task is expired:
 * - has a real due date (not the sentinel "9999-12-31")
 * - that date is strictly before today (local date)
 * - the task is not yet completed
 */
function isExpired(todo) {
    if (todo.completed) return false;
    if (!todo.dueDate || todo.dueDate === '9999-12-31') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(todo.dueDate + 'T00:00:00');
    return due < today;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

const PRIORITY_OPTIONS = [
    { value: 'High', label: '🔴 High', color: '#c9184a' },
    { value: 'Medium', label: '🟠 Medium', color: '#f57c00' },
    { value: 'Low', label: '🟢 Low', color: '#2d6a4f' },
];

const PRIORITY_DISPLAY = {
    High: ' 🔴 HIGH',
    Medium: ' 🟠 Medium',
    Low: ' 🟢 Low',
};

/**
 * Sort mode A — due date first:
 *   1. Tasks with a due date, sorted by soonest
 *   2. Tasks without a due date, sorted by priority then createdAt (oldest first)
 *
 * Sort mode B — priority first:
 *   1. Priority rank (High < Medium < Low)
 *   2. Within same priority: tasks with a due date (soonest first),
 *      then tasks without a due date (oldest createdAt first)
 */
function sortTodos(todos, mode) {
    const hasDue = t => t.dueDate && t.dueDate !== '9999-12-31';
    const createdMs = t => t.createdAt?.toMillis?.() ?? 0;

    return [...todos].sort((a, b) => {
        if (mode === 'dueDate') {
            const aDue = hasDue(a);
            const bDue = hasDue(b);
            if (aDue && bDue) return a.dueDate.localeCompare(b.dueDate);
            if (aDue) return -1;
            if (bDue) return 1;
            // both have no due date → priority then createdAt
            const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
            return pr !== 0 ? pr : createdMs(a) - createdMs(b);
        }
        // mode === 'priority'
        const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pr !== 0) return pr;
        const aDue = hasDue(a);
        const bDue = hasDue(b);
        if (aDue && bDue) return a.dueDate.localeCompare(b.dueDate);
        if (aDue) return -1;
        if (bDue) return 1;
        return createdMs(a) - createdMs(b);
    });
}

/**
 * Returns a display string like "2025-08-10 (Sun)"
 * Uses local date parsing to avoid UTC-offset day shifts.
 */
function formatDueDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    return `${dateStr} (${day})`;
}

/**
 * TodoList page
 *
 * Maps to the "User Logged In -> Home Page -> To-do List"
 * branch of the user-flow chart. Provides an interface for
 * daily task management across the app.
 *
 * Firebase Firestore is used for real-time persistence, storing tasks
 * under the subcollection `/users/{uid}/todos/`. This ensures that
 * a user's mission list is synced across devices and persists between sessions.
 *
 * Actions include adding new missions, toggling completion status
 * and removing tasks from the user's active view.
 */
function TodoList({ user, onBack, onActivityLogged }) {
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [tab, setTab] = useState('pending');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [error, setError] = useState(null);
    const [sortMode, setSortMode] = useState('dueDate'); // 'dueDate' | 'priority'
    const [loading, setLoading] = useState(true);

    // 1. Listen to Firestore
    // Subscribe to this user's todo collection, ordered by most recent.
    // This ensures the UI stays in sync without manual refreshing.
    useEffect(() => {
        if (!user) return;

        const todoRef = collection(db, 'users', user.uid, 'todos');
        const q = query(todoRef, orderBy('dueDate', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTodos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const pendingCount   = todos.filter(t => !t.completed).length;
    const completedCount = todos.filter(t => t.completed).length;
    const totalCount     = todos.length;

    const { openSharePrompt } = useSharePrompt();

    const sharePayload = {
        completedCount,
        totalCount,
        date: todayKey(),
    };

    const filteredTodos = sortTodos(
        todos.filter(todo => {
            if (tab === 'pending') return todo.completed === false;
            if (tab === 'completed') return todo.completed === true;
            return true;
        }),
        sortMode
    );

    const startEdit = (todo) => {
        setEditingId(todo.id);
        setEditText(todo.text);
        setEditDesc(todo.description || '');
    };

    const saveEdit = async (id, updatedFields = {}) => {
        const finalFields = {
            text: editText,
            description: editDesc,
            ...updatedFields
        };
        if (finalFields.text && finalFields.text.trim() === "") {
            setEditingId(null);
            return;
        }
        try {
            setError(null);
            const todoRef = doc(db, 'users', user.uid, 'todos', id);
            await updateDoc(todoRef, finalFields);
            if (Object.keys(updatedFields).length === 0) {
                setEditingId(null);
            }
        } catch (err) {
            console.error("Save error", err);
            setError("Could not update task. Please try again.");
        }
    };

    // 2. create tasks
    // Add a new task to Firestore.
    // Use serverTimestamp to ensure consistent sorting across time zones.
    const addTodo = async () => {
        if (!input.trim()) return;

        try {
            setError(null);
            await addDoc(collection(db, 'users', user.uid, 'todos'), {
                text: input,
                description: descInput,
                completed: false,
                createdAt: serverTimestamp(),
                dueDate: dueDate || "9999-12-31",
                reminderSet: false,
                priority: priority,
            });
            setInput('');
            setDescInput('');
            setDueDate('');
            setPriority('Medium');
        } catch (err) {
            console.error("Add error:", err);
            setError("Failed to add task. Please try again.");
        }
    };

    // 3. update
    // Update the 'completed' field.
    // This state change is reflected instantly in the UI via the onSnapshot listener.
    const toggleComplete = async (todo) => {
        try {
            setError(null);
            const todoRef = doc(db, 'users', user.uid, 'todos', todo.id);
            await updateDoc(todoRef, {
                completed: !todo.completed
            });
            if (!todo.completed) {
                logAction(user.uid, 'productivity', 'task');
                onActivityLogged?.();

                // Share prompt — two-part gate:
                //   action: a task was just ticked off
                //   requirement:it was the last outstanding one
                //
                // `todos` still holds the pre-write value inside this closure,
                // so the task being ticked is excluded by id rather than by
                // trusting its `completed` flag.
                const remaining = todos.filter(
                    t => !t.completed && t.id !== todo.id
                ).length;

                if (remaining === 0 && todos.length > 0) {
                    openSharePrompt(
                        'todo',
                        {
                            completedCount: todos.length,
                            totalCount: todos.length,
                            date: todayKey(),
                        },
                        { source: 'auto' }
                    );
                }
            }
        } catch (err) {
            console.error("Toggle error:", err);
            setError("Failed to update status.");
        }
    };

    // 4. delete task
    //
    // The web build hung this off a right-click context menu. Touch devices
    // have no right-click, so a long press on the row opens the same
    // destructive action as a confirmation dialog.
    const deleteTodo = async (todo) => {
        const ok = await confirm(`"${todo.text}" will be removed permanently.`, {
            title: 'Delete task?',
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!ok) return;

        try {
            setError(null);
            await deleteDoc(doc(db, 'users', user.uid, 'todos', todo.id));
        } catch (err) {
            console.error("Delete error:", err);
            setError("Could not delete task.");
        }
    };

    return (
        <Screen contentContainerStyle={styles.screen}>
            {/* Manual share — hides itself when nothing is completed yet */}
            <ScreenHeader
                title="My to-do list"
                onBack={onBack}
                right={<ShareButton domain="todo" payload={sharePayload} />}
            />

            {error ? (
                <Pressable onPress={() => setError(null)} accessibilityRole="button">
                    <Alert message={`⚠️ ${error}`} />
                </Pressable>
            ) : null}

            {/* Add-task form */}
            <View style={[styles.card, shadow('sm')]}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="New task..."
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={addTodo}
                />
                <TextInput
                    style={[styles.input, styles.textarea]}
                    value={descInput}
                    onChangeText={setDescInput}
                    placeholder="Add a description (optional)..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                />

                <DateField value={dueDate} onChange={setDueDate} placeholder="Due date (optional)" />

                <SegmentedField
                    options={PRIORITY_OPTIONS}
                    value={priority}
                    onChange={setPriority}
                />

                <PrimaryButton label="Add" onPress={addTodo} disabled={!input.trim()} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TabButton
                    label="Pending"
                    count={pendingCount}
                    active={tab === 'pending'}
                    onPress={() => setTab('pending')}
                />
                <TabButton
                    label="Completed"
                    count={completedCount}
                    active={tab === 'completed'}
                    onPress={() => setTab('completed')}
                />
                <TabButton
                    label="All"
                    count={`${completedCount}/${totalCount}`}
                    active={tab === 'all'}
                    onPress={() => setTab('all')}
                />
            </View>

            {/* Sort bar */}
            <View style={styles.sortBar}>
                <Text style={styles.sortLabel}>Sort by</Text>
                <SegmentedField
                    style={styles.flex}
                    options={[
                        { value: 'dueDate', label: '📅 Due date' },
                        { value: 'priority', label: '🔴 Priority' },
                    ]}
                    value={sortMode}
                    onChange={setSortMode}
                />
            </View>

            {loading ? (
                <Loading label="Loading…" style={styles.loading} />
            ) : (
                <View style={styles.list}>
                    {filteredTodos.map(todo => {
                        const expired = isExpired(todo);
                        const editing = editingId === todo.id;

                        return (
                            <View key={todo.id} style={[styles.item, shadow('sm')]}>
                                <Pressable
                                    onPress={() => toggleComplete(todo)}
                                    hitSlop={8}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: todo.completed }}
                                    accessibilityLabel={todo.text}
                                    style={[styles.checkbox, todo.completed && styles.checkboxChecked]}
                                >
                                    {todo.completed ? <Icon name="check" size={16} color="#fff" /> : null}
                                </Pressable>

                                <View style={styles.flex}>
                                    {editing ? (
                                        <View style={styles.editBox}>
                                            <TextInput
                                                style={styles.input}
                                                value={editText}
                                                onChangeText={setEditText}
                                                autoFocus
                                                returnKeyType="done"
                                                onSubmitEditing={() => saveEdit(todo.id)}
                                            />
                                            <TextInput
                                                style={[styles.input, styles.textarea]}
                                                value={editDesc}
                                                onChangeText={setEditDesc}
                                                placeholder="Add a description..."
                                                placeholderTextColor={colors.textMuted}
                                                multiline
                                                textAlignVertical="top"
                                            />

                                            <SegmentedField
                                                options={PRIORITY_OPTIONS}
                                                value={todo.priority}
                                                onChange={(v) => saveEdit(todo.id, { priority: v })}
                                            />

                                            <DateField
                                                value={todo.dueDate === '9999-12-31' ? '' : todo.dueDate}
                                                onChange={(v) => saveEdit(todo.id, { dueDate: v || '9999-12-31' })}
                                                placeholder="Due date (optional)"
                                            />

                                            <PrimaryButton label="Done" onPress={() => saveEdit(todo.id)} />
                                        </View>
                                    ) : (
                                        // Tap to edit, long-press to delete — the touch equivalents
                                        // of the web build's double-click and right-click.
                                        <Pressable
                                            onPress={() => startEdit(todo)}
                                            onLongPress={() => deleteTodo(todo)}
                                            accessibilityRole="button"
                                            accessibilityHint="Tap to edit, long press to delete"
                                        >
                                            <View style={styles.titleRow}>
                                                <Text
                                                    style={[
                                                        styles.itemText,
                                                        todo.completed && styles.itemTextDone,
                                                        !todo.completed && expired && styles.itemTextExpired,
                                                    ]}
                                                >
                                                    {todo.text}
                                                </Text>
                                                {expired ? (
                                                    <View style={styles.expiredTag}>
                                                        <Text style={styles.expiredTagText}>Expired</Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            {todo.description ? (
                                                <Text style={styles.itemDescription}>{todo.description}</Text>
                                            ) : null}

                                            <View style={styles.itemMeta}>
                                                <Text
                                                    style={[
                                                        styles.metaPriority,
                                                        { color: todo.priority === 'High' ? '#c9184a' : '#1a827d' },
                                                    ]}
                                                >
                                                    {PRIORITY_DISPLAY[todo.priority] ?? todo.priority}
                                                </Text>
                                                {todo.dueDate !== '9999-12-31' ? (
                                                    <Text style={[styles.metaText, expired && styles.metaExpired]}>
                                                        📅 Due: {formatDueDate(todo.dueDate)}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </Pressable>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </Screen>
    );
}

function TabButton({ label, count, active, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
        >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
            <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { gap: spacing.md, paddingBottom: 40 },
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },
    loading: { paddingVertical: 40 },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        gap: spacing.md,
    },

    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        ...type.body,
        color: colors.text,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    textarea: { minHeight: 72 },

    tabs: { flexDirection: 'row', gap: 6 },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    tabActive: { backgroundColor: colors.blPrimary, borderColor: colors.blPrimary },
    tabText: { ...type.small, color: colors.text },
    tabTextActive: { color: '#fff', fontFamily: fonts.semibold },
    tabCount: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: radius.pill,
        backgroundColor: colors.pulseBg,
    },
    tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
    tabCountText: { ...type.caption, fontSize: 10, color: colors.textMuted },
    tabCountTextActive: { color: '#fff' },

    sortBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    sortLabel: { ...type.small, color: colors.textMuted },

    list: { gap: spacing.sm },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.blOutlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkboxChecked: { backgroundColor: colors.blPrimary, borderColor: colors.blPrimary },

    editBox: { gap: spacing.sm },

    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
    itemText: { ...type.bodyMedium, color: colors.text },
    itemTextDone: { textDecorationLine: 'line-through', color: '#aaa' },
    itemTextExpired: { color: '#c9184a' },
    expiredTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(201, 24, 74, 0.1)',
    },
    expiredTagText: { ...type.caption, fontSize: 10, color: '#c9184a' },

    itemDescription: { ...type.small, color: '#666', marginVertical: 4 },
    itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
    metaPriority: { ...type.caption, fontFamily: fonts.bold, fontSize: 11 },
    metaText: { ...type.caption, fontSize: 11, color: colors.textMuted },
    metaExpired: { color: '#c9184a' },
});

export default TodoList;
