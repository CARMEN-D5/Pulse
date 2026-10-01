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


function getTodayDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}
const emptyExercises = () => [{ name: '', sets: [{ weight: '', reps: '', setCount: '1' }] }];

export function getStrengthSetCount(set = {}) {
    const count = Number(set.setCount);
    return Number.isInteger(count) && count > 0 ? count : 1;
}

export function formatStrengthSet(set = {}) {
    const count = getStrengthSetCount(set);
    return `${count} ${count === 1 ? 'set' : 'sets'} × ${set.weight} kg × ${set.reps} reps`;
}

function normaliseExercises(exercises) {
    if (!Array.isArray(exercises) || exercises.length === 0) return emptyExercises();
    return exercises.map(exercise => ({
        ...exercise,
        sets: Array.isArray(exercise.sets) && exercise.sets.length > 0
            ? exercise.sets.map(set => ({ ...set, setCount: String(getStrengthSetCount(set)) }))
            : [{ weight: '', reps: '', setCount: '1' }],
    }));
}

function isPositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isPositiveWholeNumber(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

export function hasInvalidStrengthValue(exercises) {
    return (exercises || []).some(exercise =>
        (exercise.sets || []).some(set => {
            const hasWeight = String(set.weight ?? '').trim() !== '';
            const hasReps = String(set.reps ?? '').trim() !== '';
            const hasSetCount = String(set.setCount ?? '').trim() !== '';
            return (hasWeight && !isPositiveNumber(set.weight))
                || (hasReps && !isPositiveWholeNumber(set.reps))
                || (hasSetCount && !isPositiveWholeNumber(set.setCount));
        })
    );
}

export function getActivityValidation({ text, activityDate, type, distance, duration, exercises }) {
    const errors = {};
    if (!text?.trim()) errors.name = 'Activity name is required.';
    if (!activityDate || activityDate === '9999-12-31') errors.date = 'Activity date is required.';

    if (type === 'cardio') {
        if (!isPositiveNumber(distance)) errors.distance = 'Enter a distance greater than 0.';
        if (!isPositiveNumber(duration)) errors.duration = 'Enter a duration greater than 0.';
    }

    if (type === 'strength') {
        const validExercises = Array.isArray(exercises) && exercises.length > 0
            && exercises.every(exercise =>
                Boolean(exercise.name?.trim())
                && Array.isArray(exercise.sets)
                && exercise.sets.length > 0
                && exercise.sets.every(set =>
                    isPositiveNumber(set.weight)
                    && isPositiveWholeNumber(set.reps)
                    && isPositiveWholeNumber(set.setCount)
                )
            );
        if (!validExercises) {
            errors.strength = 'Use positive values; sets and reps must be whole numbers.';
        }
    }

    return errors;
}

function hasValidationErrors(errors) {
    return Object.keys(errors).length > 0;
}

function PhysicalActivity({ user, onBack, onActivityLogged }) {
//     State
    const [activities, setActivities] = useState([]);
    const [input, setInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [activityDate, setActivityDate] = useState(getTodayDate());
    const [tab, setTab] = useState('cardio');
    const [pageTab, setPageTab] = useState('new');
    const [templateType, setTemplateType] = useState('cardio');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editActivityDate, setEditActivityDate] = useState('');
    const [error, setError] = useState(null);

    const [distance, setDistance] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [time, setTime] = useState('');
    const [editTime, setEditTime] = useState('');

    const [exercises, setExercises] = useState(() => emptyExercises());
    const [editExercises, setEditExercises] = useState(() => emptyExercises());
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
        setEditText(activity.text ?? '');
        setEditDesc(activity.description || '');
        setEditActivityDate(activity.activityDate === '9999-12-31' ? '' : activity.activityDate || '');
        setEditDistance(String(activity.distance ?? ''));
        setEditTime(String(activity.duration ?? ''));
        setEditExercises(normaliseExercises(activity.exercises));
        setError(null);
    };

    const saveEdit = async (id) => {
        const activity = activities.find(a => a.id === id);
        if (!activity) return;

        const finalFields = {
            text: editText.trim(),
            description: editDesc,
            activityDate: editActivityDate,
            distance: editDistance,
            duration: editTime,
            exercises: editExercises,
        };
        if (activity.type === "cardio") {
            finalFields.exercises = [];
        } else {
            finalFields.distance = 0;
            finalFields.duration = 0;
        }

        const validation = getActivityValidation({ ...finalFields, type: activity.type });
        if (hasValidationErrors(validation)) return;

        try {
            setError(null);
            const activityRef = doc(db, 'users', user.uid, 'physicalActivities', id);
            await updateDoc(activityRef, finalFields);
            setEditingId(null);
        } catch (err) {
            console.error("Save error", err);
            setError("Could not update Activity. Please try again");
        }
    };

    // Create Activity
    const addActivity = async () => {
        const validation = getActivityValidation({
            text: input,
            activityDate,
            type: tab,
            distance,
            duration: time,
            exercises,
        });
        if (hasValidationErrors(validation)) return;

        try {
            setError(null);
            const isCardio = tab === 'cardio';
            const activityDoc = {
                text: input.trim(),
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
            setActivityDate(getTodayDate());
            setTab('cardio');
            setDistance('');
            setTime('');
            setExercises(emptyExercises());

            // Score: log exercise action for the health domain
            logAction(user.uid, 'health', 'exercise');
            if (onActivityLogged) onActivityLogged();
        } catch (err) {
            console.error("Add error", err);
            setError("Failed to add activity. Please try again.");
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
            setError("Could not delete activity.");
        }
    };

    const addExercise = () => {
        setExercises(current => [
            ...current,
            { name: '', sets: [{ weight: '', reps: '', setCount: '1' }] },
        ]);
    };

    const addEditExercise = () => {
        setEditExercises(current => [
            ...current,
            { name: '', sets: [{ weight: '', reps: '', setCount: '1' }] },
        ]);
    };

    const removeExercise = (exerciseIndex) => {
        setExercises(current => (
            current.length > 1 ? current.filter((_, index) => index !== exerciseIndex) : current
        ));
    };

    const removeEditExercise = (exerciseIndex) => {
        setEditExercises(current => (
            current.length > 1 ? current.filter((_, index) => index !== exerciseIndex) : current
        ));
    };

    const addSet = (exerciseIndex) => {
        const updated = [...exercises];

        if (!updated[exerciseIndex]) return;

        updated[exerciseIndex] = {
            ...updated[exerciseIndex],
            sets: [...updated[exerciseIndex].sets, { weight: '', reps: '', setCount: '1' }],
        };

        setExercises(updated);
    };

    const removeSet = (exerciseIndex) => {
        const updated = [...exercises];
        const sets = updated[exerciseIndex].sets;

        if (!sets || sets.length <= 1) return;

        updated[exerciseIndex] = {
            ...updated[exerciseIndex],
            sets: sets.slice(0, -1)
        };

        setExercises(updated);
    };

    const addEditSet = (exerciseIndex) => {
        setEditExercises(current => current.map((exercise, index) => (
            index === exerciseIndex
                ? {
                    ...exercise,
                    sets: [...exercise.sets, { weight: '', reps: '', setCount: '1' }],
                }
                : exercise
        )));
    };

    const removeEditSet = (exerciseIndex) => {
        setEditExercises(current => current.map((exercise, index) => (
            index === exerciseIndex && exercise.sets.length > 1
                ? { ...exercise, sets: exercise.sets.slice(0, -1) }
                : exercise
        )));
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
        setExercises(normaliseExercises(template.exercises));
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

    const templateActivities = activities.filter(
        activity => activity.isTemplate === true && activity.type === templateType
    );
    const createValidation = getActivityValidation({
        text: input,
        activityDate,
        type: tab,
        distance,
        duration: time,
        exercises,
    });
    const canAddActivity = !hasValidationErrors(createValidation);

    return (
        <Screen contentContainerStyle={styles.screen} gradient={false} safeArea={false}>
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
                <View style={styles.fieldGroup}>
                    <View style={styles.requiredInputWrap}>
                        <TextInput
                        accessibilityLabel="Activity Name"
                        style={[
                            styles.input,
                            styles.requiredInput,
                            createValidation.name && input.length > 0 && styles.inputError,
                        ]}
                        value={input}
                        onChangeText={setInput}
                        placeholder="New Activity"
                        placeholderTextColor={colors.textMuted}
                        />
                        <Text style={styles.inputRequiredMark}>*</Text>
                    </View>
                    {createValidation.name && input.length > 0 ? (
                        <InlineError message={createValidation.name} />
                    ) : null}
                </View>
                <TextInput
                    style={[styles.input, styles.textarea]}
                    value={descInput}
                    onChangeText={setDescInput}
                    placeholder="Add a description (optional)..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlignVertical="top"
                />

                <View style={styles.fieldGroup}>
                    <RequiredLabel label="Activity Date" />
                    <DateField
                        value={activityDate}
                        onChange={setActivityDate}
                        placeholder="Select activity date"
                        compact
                    />
                    {createValidation.date ? <InlineError message={createValidation.date} /> : null}
                </View>

                <SegmentedField options={TYPE_OPTIONS} value={tab} onChange={setTab} />

                {tab === 'cardio' ? (
                    <View style={styles.row}>
                        <View style={[styles.fieldGroup, styles.flex]}>
                            <RequiredLabel label="Distance (km)" />
                            <TextInput
                                accessibilityLabel="Distance (km)"
                                style={[styles.input, createValidation.distance && distance.length > 0 && styles.inputError]}
                                value={distance}
                                onChangeText={setDistance}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="decimal-pad"
                            />
                            {createValidation.distance && distance.length > 0 ? (
                                <InlineError message={createValidation.distance} />
                            ) : null}
                        </View>
                        <View style={[styles.fieldGroup, styles.flex]}>
                            <RequiredLabel label="Duration (min)" />
                            <TextInput
                                accessibilityLabel="Duration (min)"
                                style={[styles.input, createValidation.duration && time.length > 0 && styles.inputError]}
                                value={time}
                                onChangeText={setTime}
                                placeholder="0"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="number-pad"
                            />
                            {createValidation.duration && time.length > 0 ? (
                                <InlineError message={createValidation.duration} />
                            ) : null}
                        </View>
                    </View>
                ) : null}

                {tab === 'strength' ? (
                    <View style={styles.exerciseList}>
                        {exercises.map((exercise, index) => (
                            <View key={index} style={styles.exerciseCard}>
                                <View style={styles.exerciseHeader}>
                                    <RequiredLabel label="Exercise Name" />
                                    {exercises.length > 1 ? (
                                        <ExerciseDeleteButton
                                            exercise={exercise}
                                            index={index}
                                            onPress={() => removeExercise(index)}
                                        />
                                    ) : null}
                                </View>
                                <TextInput
                                    accessibilityLabel={`Exercise ${index + 1} name`}
                                    style={[styles.input, styles.compactInput]}
                                    placeholder="e.g. Bench press"
                                    placeholderTextColor={colors.textMuted}
                                    value={exercise.name}
                                    onChangeText={(v) => {
                                        const updated = [...exercises];
                                        updated[index] = { ...updated[index], name: v };
                                        setExercises(updated);
                                    }}
                                />

                                {exercise.sets.map((set, index2) => (
                                    <StrengthSetFields
                                        key={index2}
                                        set={set}
                                        exerciseIndex={index}
                                        setIndex={index2}
                                        onChange={(field, value) => {
                                            const updated = [...exercises];
                                            updated[index] = {
                                                ...updated[index],
                                                sets: updated[index].sets.map((item, i) =>
                                                    i === index2 ? { ...item, [field]: value } : item
                                                ),
                                            };
                                            setExercises(updated);
                                        }}
                                    />
                                ))}

                                {createValidation.strength && hasInvalidStrengthValue(exercises) ? (
                                    <InlineError message={createValidation.strength} />
                                ) : null}

                                <View style={styles.row}>
                                    <SmallButton label="+ Add Set" onPress={() => addSet(index)} />
                                    {exercise.sets.length > 1 ? (
                                        <SmallButton label="- Remove Set" onPress={() => removeSet(index)} />
                                    ) : null}
                                </View>
                            </View>
                        ))}

                        <SmallButton label="+ Add Exercise" onPress={addExercise} />
                    </View>
                ) : null}

                <TutorialTarget id={TUTORIAL_TARGETS.activity.submit}>
                    <PrimaryButton label="Add" onPress={addActivity} disabled={!canAddActivity} />
                </TutorialTarget>
            </View>
            </TutorialTarget>
            ) : null}

            {/* Saved templates */}
            {pageTab === 'templates' ? (
                <View style={styles.list}>
                    <SegmentedField options={TYPE_OPTIONS} value={templateType} onChange={setTemplateType} />

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
                                        <Text style={styles.metaText}>Duration: {activity.duration} min</Text>
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
                                                        {formatStrengthSet(set)}
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
                    const editValidation = editing ? getActivityValidation({
                        text: editText,
                        activityDate: editActivityDate,
                        type: activity.type,
                        distance: editDistance,
                        duration: editTime,
                        exercises: editExercises,
                    }) : {};
                    const canSaveEdit = !hasValidationErrors(editValidation);

                    return (
                        <View key={activity.id} style={[styles.item, shadow('sm')]}>
                            {editing ? null : (
                                <Pressable
                                    onPress={() => deleteActivity(activity)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Delete activity ${activity.text}`}
                                    hitSlop={4}
                                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                                >
                                    <Icon name="delete_outline" size={22} color={colors.pulsePrimaryDark} />
                                </Pressable>
                            )}
                            {editing ? (
                                <View style={styles.editBox}>
                                    <View style={styles.fieldGroup}>
                                        <View style={styles.requiredInputWrap}>
                                            <TextInput
                                                accessibilityLabel="Edit Activity Name"
                                                style={[
                                                    styles.input,
                                                    styles.requiredInput,
                                                    editValidation.name && styles.inputError,
                                                ]}
                                                value={editText}
                                                onChangeText={setEditText}
                                                placeholder="Activity Name"
                                                placeholderTextColor={colors.textMuted}
                                                autoFocus
                                            />
                                            <Text style={styles.inputRequiredMark}>*</Text>
                                        </View>
                                        {editValidation.name ? <InlineError message={editValidation.name} /> : null}
                                    </View>
                                    <TextInput
                                        style={[styles.input, styles.textarea]}
                                        placeholder="Add a description..."
                                        placeholderTextColor={colors.textMuted}
                                        value={editDesc}
                                        onChangeText={setEditDesc}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    <View style={styles.fieldGroup}>
                                        <RequiredLabel label="Activity Date" />
                                        <DateField
                                            value={editActivityDate}
                                            onChange={setEditActivityDate}
                                            placeholder="Select activity date"
                                            compact
                                        />
                                        {editValidation.date ? <InlineError message={editValidation.date} /> : null}
                                    </View>

                                    {activity.type === 'cardio' ? (
                                        <View style={styles.editSection}>
                                            <Text style={styles.metaLabel}>Type: Cardio</Text>
                                            <View style={styles.row}>
                                                <View style={[styles.fieldGroup, styles.flex]}>
                                                    <RequiredLabel label="Distance (km)" />
                                                    <TextInput
                                                        accessibilityLabel="Edit Distance (km)"
                                                        style={[styles.input, editValidation.distance && styles.inputError]}
                                                        value={editDistance}
                                                        onChangeText={setEditDistance}
                                                        placeholder="0"
                                                        placeholderTextColor={colors.textMuted}
                                                        keyboardType="decimal-pad"
                                                    />
                                                    {editValidation.distance ? <InlineError message={editValidation.distance} /> : null}
                                                </View>
                                                <View style={[styles.fieldGroup, styles.flex]}>
                                                    <RequiredLabel label="Duration (min)" />
                                                    <TextInput
                                                        accessibilityLabel="Edit Duration (min)"
                                                        style={[styles.input, editValidation.duration && styles.inputError]}
                                                        value={editTime}
                                                        onChangeText={setEditTime}
                                                        placeholder="0"
                                                        placeholderTextColor={colors.textMuted}
                                                        keyboardType="number-pad"
                                                    />
                                                    {editValidation.duration ? <InlineError message={editValidation.duration} /> : null}
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.editSection}>
                                            <Text style={styles.metaLabel}>Type: Gym</Text>
                                            {editExercises.map((exercise, index) => (
                                                <View key={index} style={styles.exerciseCard}>
                                                    <View style={styles.exerciseHeader}>
                                                        <RequiredLabel label="Exercise Name" />
                                                        {editExercises.length > 1 ? (
                                                            <ExerciseDeleteButton
                                                                exercise={exercise}
                                                                index={index}
                                                                onPress={() => removeEditExercise(index)}
                                                            />
                                                        ) : null}
                                                    </View>
                                                    <TextInput
                                                        accessibilityLabel={`Edit exercise ${index + 1} name`}
                                                        style={[styles.input, styles.compactInput]}
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
                                                        <StrengthSetFields
                                                            key={index2}
                                                            set={set}
                                                            exerciseIndex={index}
                                                            setIndex={index2}
                                                            accessibilityPrefix="Edit "
                                                            onChange={(field, value) => {
                                                                const updated = [...editExercises];
                                                                updated[index] = {
                                                                    ...updated[index],
                                                                    sets: updated[index].sets.map((item, i) =>
                                                                        i === index2 ? { ...item, [field]: value } : item
                                                                    ),
                                                                };
                                                                setEditExercises(updated);
                                                            }}
                                                        />
                                                    ))}
                                                    {editValidation.strength && hasInvalidStrengthValue(editExercises) ? (
                                                        <InlineError message={editValidation.strength} />
                                                    ) : null}
                                                    <View style={styles.row}>
                                                        <SmallButton
                                                            label="+ Add Set"
                                                            onPress={() => addEditSet(index)}
                                                        />
                                                        {exercise.sets.length > 1 ? (
                                                            <SmallButton
                                                                label="- Remove Set"
                                                                onPress={() => removeEditSet(index)}
                                                            />
                                                        ) : null}
                                                    </View>
                                                </View>
                                            ))}
                                            <SmallButton label="+ Add Exercise" onPress={addEditExercise} />
                                        </View>
                                    )}

                                    <PrimaryButton
                                        label="Done"
                                        onPress={() => saveEdit(activity.id)}
                                        disabled={!canSaveEdit}
                                    />
                                </View>
                            ) : (
                                // Tap to edit, long-press to delete — the touch
                                // equivalents of double-click and right-click.
                                <Pressable
                                    onPress={() => startEdit(activity)}
                                    onLongPress={() => deleteActivity(activity)}
                                    accessibilityRole="button"
                                    accessibilityHint="Tap to edit, long press to delete"
                                    style={styles.itemContent}
                                >
                                    <Text style={styles.itemText}>{activity.text}</Text>

                                    <Text style={styles.actionHint}>
                                        Tap to edit
                                    </Text>

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
                                                <Text style={styles.metaText}>Duration: {activity.duration} min</Text>
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
                                                                {formatStrengthSet(set)}
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
                                    <Icon
                                        name={activity.isTemplate ? 'favorite' : 'favorite_border'}
                                        size={20}
                                        color={activity.isTemplate ? colors.pulsePrimaryDark : colors.textMuted}
                                    />
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

function RequiredLabel({ label, compact = false }) {
    return (
        <Text style={[styles.fieldLabel, compact && styles.compactFieldLabel]} numberOfLines={1}>
            {label} <Text style={styles.requiredMark}>*</Text>
        </Text>
    );
}

function InlineError({ message }) {
    return <Text style={styles.inlineError}>{message}</Text>;
}

function StrengthSetFields({
    set,
    exerciseIndex,
    setIndex,
    onChange,
    accessibilityPrefix = '',
}) {
    const fieldNumber = `${exerciseIndex + 1}.${setIndex + 1}`;
    return (
        <View style={styles.strengthFields}>
            <View style={[styles.fieldGroup, styles.setCountField]}>
                <RequiredLabel label="Number of Sets" compact />
                <TextInput
                    accessibilityLabel={`${accessibilityPrefix}Number of Sets ${fieldNumber}`}
                    style={[styles.input, styles.compactInput]}
                    value={String(set.setCount ?? '1')}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    onChangeText={value => onChange('setCount', value)}
                />
            </View>
            <View style={[styles.fieldGroup, styles.weightField]}>
                <RequiredLabel label="Weight (kg)" compact />
                <TextInput
                    accessibilityLabel={`${accessibilityPrefix}Weight (kg) ${fieldNumber}`}
                    style={[styles.input, styles.compactInput]}
                    value={String(set.weight ?? '')}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    onChangeText={value => onChange('weight', value)}
                />
            </View>
            <View style={[styles.fieldGroup, styles.repsField]}>
                <RequiredLabel label="Reps" compact />
                <TextInput
                    accessibilityLabel={`${accessibilityPrefix}Reps ${fieldNumber}`}
                    style={[styles.input, styles.compactInput]}
                    value={String(set.reps ?? '')}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    onChangeText={value => onChange('reps', value)}
                />
            </View>
        </View>
    );
}

function ExerciseDeleteButton({ exercise, index, onPress }) {
    const name = exercise.name?.trim() || `${index + 1}`;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Remove exercise ${name}`}
            hitSlop={8}
            style={({ pressed }) => [styles.exerciseDeleteButton, pressed && styles.pressed]}
        >
            <Icon name="delete_outline" size={20} color={colors.pulsePrimaryDark} />
        </Pressable>
    );
}

function SmallButton({ label, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            hitSlop={4}
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
    strengthFields: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    setCountField: { flex: 1.35 },
    weightField: { flex: 1.05 },
    repsField: { flex: 0.7 },
    pressed: { opacity: 0.7 },
    fieldGroup: { gap: 3 },
    fieldLabel: { ...type.label, color: colors.text, paddingLeft: 2 },
    compactFieldLabel: { fontSize: 11, lineHeight: 14, paddingLeft: 0 },
    requiredMark: { color: colors.error },
    inlineError: { ...type.caption, color: colors.error, paddingLeft: 2, lineHeight: 15 },
    inputError: { borderColor: colors.error },
    requiredInputWrap: { position: 'relative' },
    requiredInput: { paddingRight: 36 },
    inputRequiredMark: {
        position: 'absolute',
        right: 14,
        top: 11,
        fontFamily: fonts.semibold,
        fontSize: 17,
        lineHeight: 20,
        color: colors.error,
    },

    actionHint: {
        ...type.caption,
        color: colors.textMuted,
        marginTop: 4,
    },

    card: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
    },

    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        minHeight: 44,
        paddingVertical: 9,
        paddingHorizontal: spacing.md,
        ...type.body,
        color: colors.text,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    compactInput: { minHeight: 40, paddingVertical: 7, paddingHorizontal: spacing.sm },
    textarea: { minHeight: 56, paddingTop: spacing.sm },
    exerciseList: { gap: spacing.sm },
    exerciseCard: {
        gap: 6,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
        backgroundColor: colors.pulseBg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exerciseHeader: {
        minHeight: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    exerciseDeleteButton: {
        width: 36,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallBtn: {
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.pulsePrimary,
    },
    smallBtnText: { ...type.small, color: colors.pulsePrimaryDark },

    list: { gap: spacing.sm },
    item: {
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        position: 'relative',
    },
    itemContent: { paddingRight: 44 },
    editBox: { gap: spacing.sm },
    editSection: { gap: 6 },

    deleteButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },

    heartBtn: { alignSelf: 'flex-end', paddingTop: spacing.sm },

    itemText: { ...type.title, fontFamily: fonts.semibold, color: colors.text },
    itemDescription: { ...type.small, color: '#666', marginVertical: 4 },
    metaText: { ...type.small, color: colors.textMuted },
    metaLabel: { ...type.label, fontSize: 12, color: colors.text, marginTop: 4 },
    activityData: { marginTop: spacing.sm, gap: 2 },
    exerciseSummary: { marginTop: 4, gap: 2 },
    setText: { ...type.caption, fontSize: 12, color: colors.textMuted, paddingLeft: spacing.md },
});

export default PhysicalActivity;
