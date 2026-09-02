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
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import DateField from '../components/DateField';
import SegmentedField from '../components/SegmentedField';
import { Alert, PrimaryButton, Screen, ScreenHeader } from '../components/ui';
import { db } from '../firebase';
import { logAction } from '../firestore/scoring';
import { colors, fonts, radius, shadow, spacing, type } from '../theme';
import { confirm } from '../utils/dialogs';
import { useSharePrompt, ShareButton } from '../components/share';
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from '../tutorial';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDueDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) {
        return '';
    }

    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';

    const [y, m, d] = parts.map(Number);

    if (!y || !m || !d) return '';

    const date = new Date(y, m - 1, d);

    if (isNaN(date.getTime())) return '';

    const day = WEEKDAYS[date.getDay()];
    return `${dateStr} (${day})`;
}

const TYPE_OPTIONS = [
    { value: 'cardio', label: 'Cardio' },
    { value: 'strength', label: 'Strength' },
];

/**
 * Helper to determine if a workout is worth sharing to social.
 *
 * cardio    needs a distance or a time
 * strength  needs at least one set with a real weight or rep count — the form
 *           initialises with one blank exercise holding one blank set, so
 *           "has exercises" would be true even for an empty submission and the
 *           card would read "1 exercise, 1 set, 0 kg".
 */
function isWorthSharing(activity) {
    if (activity.type === 'cardio') {
        return Number(activity.distance) > 0 || Boolean(activity.duration);
    }
    return (activity.exercises || []).some(ex =>
        (ex.sets || []).some(s => Number(s.reps) > 0 || Number(s.weight) > 0)
    );
}

const PAGE_OPTIONS = [
    { value: 'new', label: 'New Activity' },
    { value: 'templates', label: 'Templates' },
];

const EMPTY_EXERCISES = [{ name: '', sets: [{ weight: '', reps: '' }] }];

function PhysicalActivity({ user, onBack, onActivityLogged }) {
//     State
    const [activities, setActivities] = useState([]);
    const [input, setInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [activityDate, setActivityDate] = useState('');
    const [tab, setTab] = useState('cardio');
    const [pageTab, setPageTab] = useState('new');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [error, setError] = useState(null);

    const [distance, setDistance] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [time, setTime] = useState('');
    const [editTime, setEditTime] = useState('');

    const [exercises, setExercises] = useState(EMPTY_EXERCISES);
    const [editExercises, setEditExercises] = useState(EMPTY_EXERCISES);
    useTutorial('activity', {
        enabled: Boolean(user?.uid),
        actions: { showNew: () => setPageTab('new') },
    });

    const { openSharePrompt } = useSharePrompt();

    // Most recent activity, used by the manual share button in the header.
    // The query orders by createdAt DESCENDING, so the newest is index 0.
    const latestActivity = activities[0];

    // Load Activities from firebase
    useEffect(() => {
        if (!user) return;

        const activityRef = collection(db, 'users', user.uid, 'physicalActivities');
        const q = query(activityRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubscribe();
    }, [user]);

    const startEdit = (activity) => {
        setEditingId(activity.id);
        setEditText(activity.text);
        setEditDesc(activity.description || '');
        setEditDistance(String(activity.distance ?? ''));
        setEditTime(String(activity.duration ?? ''));
        setEditExercises(activity.exercises?.length ? activity.exercises : EMPTY_EXERCISES);
    };

    const saveEdit = async (id, updateFields = {}) => {
        const activity = activities.find(a => a.id === id);
        if (!activity) return;

        let finalFields = {
            text: editText,
            description: editDesc,
            distance: editDistance,
            duration: editTime,
            exercises: editExercises,
            ...updateFields
        };
        if (activity.type === "cardio") {
            finalFields.exercises = [];
        } else {
            finalFields.distance = 0;
            finalFields.duration = 0;
        }

        if (finalFields.text && finalFields.text.trim() === "") {
            setEditingId(null);
            return;
        }
        try {
            setError(null);
            const activityRef = doc(db, 'users', user.uid, 'physicalActivities', id);
            await updateDoc(activityRef, finalFields);
            if (Object.keys(updateFields).length === 0) {
                setEditingId(null);
            }
        } catch (err) {
            console.error("Save error", err);
            setError("Could not update Activity. Please try again");
        }
    };

    // Create Activity
    const addActivity = async () => {
        if (!input.trim()) return;

        try {
            setError(null);
            const isCardio = tab === 'cardio';
            const activityDoc = {
                text: input,
                description: descInput,
                type: tab,
                distance: isCardio ? distance : 0,
                duration: isCardio ? time : 0,
                exercises: isCardio ? [] : exercises,
                activityDate: activityDate,
                isTemplate: false,
            };

            await addDoc(collection(db, 'users', user.uid, 'physicalActivities'), {
                ...activityDoc,
                createdAt: serverTimestamp(),
            });

            // Share prompt — two-part gate:
            //   action      > the activity was saved
            //   requirement > it actually has something worth showing
            if (isWorthSharing(activityDoc)) {
                openSharePrompt('fitness', activityDoc, { source: 'auto' });
            }

            // Reset runs either way, shared or not.
            setInput('');
            setDescInput('');
            setActivityDate('');
            setTab('cardio');
            setDistance('');
            setTime('');
            setExercises(EMPTY_EXERCISES);

            // Score: log exercise action for the health domain
            logAction(user.uid, 'health', 'exercise');
            if (onActivityLogged) onActivityLogged();
        } catch (err) {
            console.error("Add error", err);
            setError("Failed to add task. Please try again.");
        }
    };

//    delete
//
//    The web build hung this off a right-click context menu. Touch devices have
//    no right-click, so a long press on the row opens the same destructive
//    action as a confirmation dialog.
    const deleteActivity = async (activity) => {
        const ok = await confirm(`"${activity.text}" will be removed permanently.`, {
            title: 'Delete activity?',
            confirmLabel: 'Delete',
            destructive: true,
        });
        if (!ok) return;

        try {
            setError(null);
            await deleteDoc(doc(db, 'users', user.uid, 'physicalActivities', activity.id));
        } catch (err) {
            console.error("Delete error:", err);
            setError("Could not delete task.");
        }
    };

    const addExercise = () => {
        setExercises([...exercises, { name: '', sets: [{ weight: '', reps: '' }] }]);
    };

    const addSet = (exerciseIndex) => {
        const updated = [...exercises];

        if (!updated[exerciseIndex]) return;

        updated[exerciseIndex] = {
            ...updated[exerciseIndex],
            sets: [...updated[exerciseIndex].sets, { weight: '', reps: '' }],
        };

        setExercises(updated);
    };

    const removeSet = (exerciseIndex) => {
        const updated = [...exercises];
        const sets = updated[exerciseIndex].sets;

        if (!sets || sets.length === 0) return;

        updated[exerciseIndex] = {
            ...updated[exerciseIndex],
            sets: sets.slice(0, -1)
        };

        setExercises(updated);
    };

    // Templates: a saved activity can be starred and later replayed as the
    // starting point for a new one.
    const applyTemplate = (template) => {
        setPageTab('new');
        setInput(template.text ?? '');
        setTab(template.type);
        setDescInput(template.description ?? '');
        setDistance(String(template.distance ?? ''));
        setTime(String(template.duration ?? ''));
        setExercises(template.exercises?.length ? template.exercises : EMPTY_EXERCISES);
    };

    const changeTemplate = async (id, val) => {
        try {
            setError(null);
            const activityRef = doc(db, 'users', user.uid, 'physicalActivities', id);
            await updateDoc(activityRef, { isTemplate: val });
        } catch (err) {
            console.error("Save error", err);
            setError("Could not update Activity. Please try again");
        }
    };

    const templateActivities = activities.filter(activity => activity.isTemplate === true);

    return (
        <Screen contentContainerStyle={styles.screen}>
            <ScreenHeader
                title="My Physical Activities"
                onBack={onBack}
                right={<ShareButton domain="fitness" payload={latestActivity} />}
            />

            {error ? (
                <Pressable onPress={() => setError(null)} accessibilityRole="button">
                    <Alert message={`⚠️ ${error}`} />
                </Pressable>
            ) : null}

            <TutorialTarget id={TUTORIAL_TARGETS.activity.pages}>
                <SegmentedField options={PAGE_OPTIONS} value={pageTab} onChange={setPageTab} />
            </TutorialTarget>

            {/* Add-activity form */}
            {pageTab === 'new' ? (
            <TutorialTarget id={TUTORIAL_TARGETS.activity.form}>
            <View style={[styles.card, shadow('sm')]}>
                <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="New Activity..."
                    placeholderTextColor={colors.textMuted}
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

                <DateField
                    value={activityDate}
                    onChange={setActivityDate}
                    placeholder="Activity date"
                />

                <SegmentedField options={TYPE_OPTIONS} value={tab} onChange={setTab} />

                {tab === 'cardio' ? (
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, styles.flex]}
                            value={distance}
                            onChangeText={setDistance}
                            placeholder="Distance (km)"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                        />
                        <TextInput
                            style={[styles.input, styles.flex]}
                            value={time}
                            onChangeText={setTime}
                            placeholder="Duration (HH:MM)"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                ) : null}

                {tab === 'strength' ? (
                    <View style={styles.exerciseList}>
                        {exercises.map((exercise, index) => (
                            <View key={index} style={styles.exerciseCard}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Exercise"
                                    placeholderTextColor={colors.textMuted}
                                    value={exercise.name}
                                    onChangeText={(v) => {
                                        const updated = [...exercises];
                                        updated[index] = { ...updated[index], name: v };
                                        setExercises(updated);
                                    }}
                                />

                                {exercise.sets.map((set, index2) => (
                                    <View key={index2} style={styles.setRow}>
                                        <TextInput
                                            style={[styles.input, styles.flex]}
                                            placeholder="weight"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="decimal-pad"
                                            value={set.weight}
                                            onChangeText={(v) => {
                                                const updated = [...exercises];
                                                updated[index] = {
                                                    ...updated[index],
                                                    sets: updated[index].sets.map((s, i) =>
                                                        i === index2 ? { ...s, weight: v } : s
                                                    ),
                                                };
                                                setExercises(updated);
                                            }}
                                        />
                                        <Text style={styles.unit}>kg</Text>

                                        <TextInput
                                            style={[styles.input, styles.flex]}
                                            placeholder="reps"
                                            placeholderTextColor={colors.textMuted}
                                            keyboardType="number-pad"
                                            value={set.reps}
                                            onChangeText={(v) => {
                                                const updated = [...exercises];
                                                updated[index] = {
                                                    ...updated[index],
                                                    sets: updated[index].sets.map((s, i) =>
                                                        i === index2 ? { ...s, reps: v } : s
                                                    ),
                                                };
                                                setExercises(updated);
                                            }}
                                        />
                                        <Text style={styles.unit}>reps</Text>
                                    </View>
                                ))}

                                <View style={styles.row}>
                                    <SmallButton label="+ Add Set" onPress={() => addSet(index)} />
                                    <SmallButton label="- Remove Set" onPress={() => removeSet(index)} />
                                </View>
                            </View>
                        ))}

                        <SmallButton label="+ Add Exercise" onPress={addExercise} />
                    </View>
                ) : null}

                <TutorialTarget id={TUTORIAL_TARGETS.activity.submit}>
                    <PrimaryButton label="Add" onPress={addActivity} disabled={!input.trim()} />
                </TutorialTarget>
            </View>
            </TutorialTarget>
            ) : null}

            {/* Saved templates */}
            {pageTab === 'templates' ? (
                <View style={styles.list}>
                    {templateActivities.length === 0 ? (
                        <Text style={styles.metaText}>
                            No templates yet. Tap 🤍 on an activity to save it as one.
                        </Text>
                    ) : null}

                    {templateActivities.map(activity => (
                        <View key={activity.id} style={[styles.item, shadow('sm')]}>
                            <Text style={styles.itemText}>{activity.text}</Text>

                            {activity.description ? (
                                <Text style={styles.itemDescription}>{activity.description}</Text>
                            ) : null}

                            <View style={styles.activityData}>
                                {activity.type === 'cardio' ? (
                                    <>
                                        <Text style={styles.metaLabel}>Type: Cardio</Text>
                                        <Text style={styles.metaText}>Distance: {activity.distance}km</Text>
                                        <Text style={styles.metaText}>Time: {activity.duration}</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.metaLabel}>Type: GYM</Text>
                                        {(activity.exercises ?? []).map((exercise, index) => (
                                            <View key={index} style={styles.exerciseSummary}>
                                                <Text style={styles.metaText}>
                                                    Exercise: {exercise.name}
                                                </Text>
                                                {(exercise.sets ?? []).map((set, index2) => (
                                                    <Text key={index2} style={styles.setText}>
                                                        {set.weight} x{set.reps}
                                                    </Text>
                                                ))}
                                            </View>
                                        ))}
                                    </>
                                )}
                            </View>

                            <SmallButton label="Use Template" onPress={() => applyTemplate(activity)} />
                        </View>
                    ))}
                </View>
            ) : null}

            {/* Activity list */}
            {pageTab !== 'templates' ? (
            <View style={styles.list}>
                {activities.map(activity => {
                    const editing = editingId === activity.id;

                    return (
                        <View key={activity.id} style={[styles.item, shadow('sm')]}>
                            {editing ? (
                                <View style={styles.editBox}>
                                    <TextInput
                                        style={styles.input}
                                        value={editText}
                                        onChangeText={setEditText}
                                        autoFocus
                                    />
                                    <TextInput
                                        style={[styles.input, styles.textarea]}
                                        placeholder="Add a description..."
                                        placeholderTextColor={colors.textMuted}
                                        value={editDesc}
                                        onChangeText={setEditDesc}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    <DateField
                                        value={activity.activityDate === '9999-12-31' ? '' : activity.activityDate}
                                        onChange={(v) => saveEdit(activity.id, { activityDate: v || '9999-12-31' })}
                                        placeholder="Activity date"
                                    />

                                    {activity.type === 'cardio' ? (
                                        <View style={styles.editSection}>
                                            <Text style={styles.metaLabel}>Type: Cardio</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={editDistance}
                                                onChangeText={setEditDistance}
                                                placeholder="Distance (km)"
                                                placeholderTextColor={colors.textMuted}
                                                keyboardType="decimal-pad"
                                            />
                                            <TextInput
                                                style={styles.input}
                                                value={editTime}
                                                onChangeText={setEditTime}
                                                placeholder="Duration (HH:MM)"
                                                placeholderTextColor={colors.textMuted}
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.editSection}>
                                            <Text style={styles.metaLabel}>Type: Gym</Text>
                                            {editExercises.map((exercise, index) => (
                                                <View key={index} style={styles.exerciseCard}>
                                                    <TextInput
                                                        style={styles.input}
                                                        value={exercise.name}
                                                        placeholder="Exercise"
                                                        placeholderTextColor={colors.textMuted}
                                                        onChangeText={(v) => {
                                                            const updated = [...editExercises];
                                                            updated[index] = { ...updated[index], name: v };
                                                            setEditExercises(updated);
                                                        }}
                                                    />
                                                    {exercise.sets.map((set, index2) => (
                                                        <View key={index2} style={styles.setRow}>
                                                            <TextInput
                                                                style={[styles.input, styles.flex]}
                                                                value={set.weight}
                                                                placeholder="weight"
                                                                placeholderTextColor={colors.textMuted}
                                                                keyboardType="decimal-pad"
                                                                onChangeText={(v) => {
                                                                    const updated = [...editExercises];
                                                                    updated[index] = {
                                                                        ...updated[index],
                                                                        sets: updated[index].sets.map((s, i) =>
                                                                            i === index2 ? { ...s, weight: v } : s
                                                                        )
                                                                    };
                                                                    setEditExercises(updated);
                                                                }}
                                                            />
                                                            <TextInput
                                                                style={[styles.input, styles.flex]}
                                                                value={set.reps}
                                                                placeholder="reps"
                                                                placeholderTextColor={colors.textMuted}
                                                                keyboardType="number-pad"
                                                                onChangeText={(v) => {
                                                                    const updated = [...editExercises];
                                                                    updated[index] = {
                                                                        ...updated[index],
                                                                        sets: updated[index].sets.map((s, i) =>
                                                                            i === index2 ? { ...s, reps: v } : s
                                                                        )
                                                                    };
                                                                    setEditExercises(updated);
                                                                }}
                                                            />
                                                        </View>
                                                    ))}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <PrimaryButton label="Done" onPress={() => saveEdit(activity.id)} />
                                </View>
                            ) : (
                                // Tap to edit, long-press to delete — the touch
                                // equivalents of double-click and right-click.
                                <Pressable
                                    onPress={() => startEdit(activity)}
                                    onLongPress={() => deleteActivity(activity)}
                                    accessibilityRole="button"
                                    accessibilityHint="Tap to edit, long press to delete"
                                >
                                    <Text style={styles.itemText}>{activity.text}</Text>

                                    {activity.description ? (
                                        <Text style={styles.itemDescription}>{activity.description}</Text>
                                    ) : null}

                                    {activity.activityDate && activity.activityDate !== '9999-12-31' ? (
                                        <Text style={styles.metaText}>
                                            📅 Date: {formatDueDate(activity.activityDate)}
                                        </Text>
                                    ) : null}

                                    <View style={styles.activityData}>
                                        {activity.type === 'cardio' ? (
                                            <>
                                                <Text style={styles.metaLabel}>Type: Cardio</Text>
                                                <Text style={styles.metaText}>Distance: {activity.distance}km</Text>
                                                <Text style={styles.metaText}>Time: {activity.duration}</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.metaLabel}>Type: GYM</Text>
                                                {(activity.exercises ?? []).map((exercise, index) => (
                                                    <View key={index} style={styles.exerciseSummary}>
                                                        <Text style={styles.metaText}>
                                                            Exercise: {exercise.name}
                                                        </Text>
                                                        {(exercise.sets ?? []).map((set, index2) => (
                                                            <Text key={index2} style={styles.setText}>
                                                                {set.weight} x{set.reps}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                ))}
                                            </>
                                        )}
                                    </View>
                                </Pressable>
                            )}

                            {editing ? null : (
                                <Pressable
                                    onPress={() => changeTemplate(activity.id, !activity.isTemplate)}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel={
                                        activity.isTemplate
                                            ? 'Remove from templates'
                                            : 'Save as template'
                                    }
                                    style={({ pressed }) => [styles.heartBtn, pressed && { opacity: 0.7 }]}
                                >
                                    <Text style={styles.heartText}>
                                        {activity.isTemplate ? '❤️' : '🤍'}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    );
                })}
            </View>
            ) : null}
        </Screen>
    );
}

function SmallButton({ label, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
        >
            <Text style={styles.smallBtnText}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { gap: spacing.md, paddingBottom: 40 },
    flex: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pressed: { opacity: 0.7 },

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
    unit: { ...type.small, color: colors.textMuted },

    exerciseList: { gap: spacing.md },
    exerciseCard: {
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.pulseBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

    smallBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.blPrimary,
    },
    smallBtnText: { ...type.small, color: colors.blPrimary },

    list: { gap: spacing.sm },
    item: {
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    editBox: { gap: spacing.sm },
    editSection: { gap: spacing.sm },

    heartBtn: { alignSelf: 'flex-end', paddingTop: spacing.sm },
    heartText: { fontSize: 20 },

    itemText: { ...type.title, fontFamily: fonts.semibold, color: colors.text },
    itemDescription: { ...type.small, color: '#666', marginVertical: 4 },
    metaText: { ...type.small, color: colors.textMuted },
    metaLabel: { ...type.label, fontSize: 12, color: colors.text, marginTop: 4 },
    activityData: { marginTop: spacing.sm, gap: 2 },
    exerciseSummary: { marginTop: 4, gap: 2 },
    setText: { ...type.caption, fontSize: 12, color: colors.textMuted, paddingLeft: spacing.md },
});

export default PhysicalActivity;
