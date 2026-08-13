import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import './Physical.css';
import {
    collection,
    addDoc,
    query,
    onSnapshot,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { useSharePrompt, ShareButton } from '../components/share';


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

const emptyExercises = () => [
    {
        name: '',
        sets: [{ weight: '', reps: '' }]
    }
];


function PhysicalActivity({ user, onBack }) {
    // ---------------------------------------------------------------- state
    const [activities, setActivities] = useState([]);
    const [descInput, setDescInput] = useState('');
    const [activityDate, setActivityDate] = useState('');
    const [activityTab, setActivityTab] = useState('pending');
    const [pageTab, setPageTab] = useState('pending');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [menuPos, setMenuPos] = useState(null);
    const [error, setError] = useState(null);

    const [distance, setDistance] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [time, setTime] = useState('');
    const [editTime, setEditTime] = useState('');

    const [exercises, setExercises] = useState(emptyExercises);
    const [editExercises, setEditExercises] = useState(emptyExercises);

    const { openSharePrompt } = useSharePrompt();

    // Most recent activity, used by the manual share button in the header.
    // The query orders by createdAt DESCENDING, so the newest is index 0.
    const latestActivity = activities[0];


    // ------------------------------------------------------------- effects
    useEffect(() => {
        if (!user) return;

        const activityRef = collection(db, 'users', user.uid, 'physicalActivities');
        const q = query(activityRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleGlobalClick = () => {
            setMenuPos(null);
        };
        window.addEventListener('click', handleGlobalClick);

        return () => {
            window.removeEventListener('click', handleGlobalClick);
        };
    }, []);


    // --------------------------------------------------------------- edit
    const startEdit = (activity) => {
        setMenuPos(null);
        setEditingId(activity.id);
        setEditText(activity.text || '');
        setEditDesc(activity.description || '');
        setEditDistance(activity.distance ?? '');
        setEditTime(activity.duration ?? '');
        setEditExercises(
            activity.exercises && activity.exercises.length
                ? activity.exercises
                : emptyExercises()
        );
    };

    const saveEdit = async (id, updateFields = {}) => {
        const activity = activities.find(a => a.id === id);
        if (!activity) return;

        const finalFields = {
            text: editText,
            description: editDesc,
            distance: editDistance,
            duration: editTime,
            exercises: editExercises,
            ...updateFields
        };

        if (activity.type === 'cardio') {
            finalFields.exercises = [];
        } else {
            finalFields.distance = 0;
            finalFields.duration = 0;
        }

        if (finalFields.text && finalFields.text.trim() === '') {
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
            console.error('Save error', err);
            setError('Could not update Activity. Please try again');
        }
    };

    const handleKeyDown = (e, id) => {
        if (e.key === 'Enter') {
            saveEdit(id);
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleContextMenu = (e, id) => {
        e.preventDefault();
        setMenuPos({ x: e.pageX, y: e.pageY, id: id });
    };


    // -------------------------------------------------------------- create
    const addActivity = async (e) => {
        e.preventDefault();

        if (activityTab !== 'cardio' && activityTab !== 'strength') return;

        const isCardio = activityTab === 'cardio';

        const activityDoc = {
            text: activityTab,
            description: descInput,
            type: activityTab,
            distance: isCardio ? distance : 0,
            duration: isCardio ? time : 0,
            exercises: isCardio ? [] : exercises,
            activityDate: activityDate,
            isTemplate: false,
        };

        try {
            setError(null);
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
            setDescInput('');
            setActivityDate('');
            setActivityTab('');
            setPageTab('');
            setDistance('');
            setTime('');
            setExercises(emptyExercises());
        } catch (err) {
            console.error('Add error', err);
            setError('Failed to add task. Please try again.');
        }
    };


    // -------------------------------------------------------------- delete
    const deleteActivity = async (id) => {
        try {
            setError(null);
            await deleteDoc(doc(db, 'users', user.uid, 'physicalActivities', id));
        } catch (err) {
            console.error('Delete error:', err);
            setError('Could not delete task.');
        }
    };


    // ----------------------------------------------------------- exercises
    const addExercise = () => {
        setExercises(prev => [
            ...prev,
            {
                name: '',
                sets: [{ weight: '', reps: '' }]
            }
        ]);
    };

    const addSet = (exerciseIndex) => {
        setExercises(prev => prev.map((ex, i) =>
            i === exerciseIndex
                ? { ...ex, sets: [...(ex.sets || []), { weight: '', reps: '' }] }
                : ex
        ));
    };

    const removeSet = (exerciseIndex) => {
        setExercises(prev => prev.map((ex, i) => {
            if (i !== exerciseIndex) return ex;
            const sets = ex.sets || [];
            if (sets.length === 0) return ex;
            return { ...ex, sets: sets.slice(0, -1) };
        }));
    };


    // ----------------------------------------------------------- templates
    const applyTemplate = (template) => {
        setPageTab('New Activity');
        setActivityTab(template.type);
        setDescInput(template.description || '');
        setDistance(template.distance ?? '');
        setTime(template.duration ?? '');
        setExercises(
            template.exercises && template.exercises.length
                ? template.exercises
                : emptyExercises()
        );
    };

    const changeTemplate = async (id, val) => {
        try {
            setError(null);
            const activityRef = doc(db, 'users', user.uid, 'physicalActivities', id);
            await updateDoc(activityRef, { isTemplate: val });
        } catch (err) {
            console.error('Save error', err);
            setError('Could not update Activity. Please try again');
        }
    };

    const templateActivities = activities.filter(activity => activity.isTemplate === true);


    // ---------------------------------------------------------------- view
    return (
        <div className="activity-shell">
            {error && (
                <div className="error-banner" onClick={() => setError(null)}>
                    ⚠️ {error} <span className="close-error">×</span>
                </div>
            )}
            <div className="activity-container">
                <div className="activity-header">
                    <button onClick={onBack} className="btn-back" type="button">
                        Back
                    </button>
                    <h2 className="activity-title">My Physical Activities</h2>
                    {/* Manual share of the most recent activity. Hides itself
                        when there's nothing shareable yet. */}
                    <ShareButton domain="fitness" payload={latestActivity} />
                </div>

                <div className="activity-form-card">
                    <div className="activity-tabs-card">
                        {['New Activity', 'Templates'].map(t => (
                            <button
                                key={t}
                                className={`tab-btn ${pageTab === t ? 'active' : ''}`}
                                onClick={() => setPageTab(t)}
                                type="button"
                            >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="activity-form">
                        {pageTab === 'New Activity' && (
                            <div>
                                <div className="activity-tabs-card">
                                    {['cardio', 'strength'].map(t => (
                                        <button
                                            key={t}
                                            className={`tab-btn ${activityTab === t ? 'active' : ''}`}
                                            onClick={() => setActivityTab(t)}
                                            type="button"
                                        >
                                            {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <form onSubmit={addActivity} className="activity-input-group">
                                    <textarea
                                        className="input-field-styled"
                                        value={descInput}
                                        onChange={(e) => setDescInput(e.target.value)}
                                        placeholder="Add a description (optional)..."
                                    />

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="date"
                                            className="input-field-styled"
                                            style={{ flex: 1 }}
                                            value={activityDate}
                                            onChange={(e) => setActivityDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="activity-form">
                                        {activityTab === 'cardio' && (
                                            <div>
                                                <input
                                                    className="input-field-styled"
                                                    value={distance}
                                                    onChange={(e) => setDistance(e.target.value)}
                                                    placeholder="Distance (km)"
                                                    style={{ flex: 1, padding: '8px' }}
                                                />
                                                <input
                                                    className="input-field-styled"
                                                    value={time}
                                                    onChange={(e) => setTime(e.target.value)}
                                                    placeholder="Duration (HH:MM)"
                                                    style={{ flex: 1, padding: '8px' }}
                                                />
                                            </div>
                                        )}

                                        {activityTab === 'strength' && (
                                            <div>
                                                {exercises.map((exercise, index) => (
                                                    <div key={index} className="exercise-card">
                                                        {/* TODO: make this a dropdown */}
                                                        <input
                                                            className="input-field-styled"
                                                            placeholder="Exercise"
                                                            style={{ flex: 1, padding: '8px' }}
                                                            value={exercise.name}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setExercises(prev => prev.map((ex, i) =>
                                                                    i === index ? { ...ex, name: val } : ex
                                                                ));
                                                            }}
                                                        />

                                                        {(exercise.sets || []).map((set, index2) => (
                                                            <div key={index2} className="set-card">
                                                                <input
                                                                    className="input-field-styled"
                                                                    placeholder="weight"
                                                                    style={{ flex: 1, padding: '8px' }}
                                                                    value={set.weight}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setExercises(prev => prev.map((ex, i) =>
                                                                            i !== index ? ex : {
                                                                                ...ex,
                                                                                sets: ex.sets.map((s, j) =>
                                                                                    j === index2 ? { ...s, weight: val } : s
                                                                                )
                                                                            }
                                                                        ));
                                                                    }}
                                                                /> kg
                                                                <input
                                                                    className="input-field-styled"
                                                                    placeholder="reps"
                                                                    style={{ flex: 1, padding: '8px' }}
                                                                    value={set.reps}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setExercises(prev => prev.map((ex, i) =>
                                                                            i !== index ? ex : {
                                                                                ...ex,
                                                                                sets: ex.sets.map((s, j) =>
                                                                                    j === index2 ? { ...s, reps: val } : s
                                                                                )
                                                                            }
                                                                        ));
                                                                    }}
                                                                /> reps
                                                            </div>
                                                        ))}

                                                        <button type="button" className="btn-back" onClick={() => addSet(index)}>
                                                            + Add Set
                                                        </button>

                                                        <button type="button" className="btn-back" onClick={() => removeSet(index)}>
                                                            - Remove Set
                                                        </button>
                                                    </div>
                                                ))}

                                                <button type="button" className="btn-back" onClick={addExercise}>
                                                    + Add Exercise
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" className="btn-teal">Add</button>
                                </form>
                            </div>
                        )}

                        {pageTab === 'Templates' && (
                            <div>
                                <ul className="activity-list-styled">
                                    {templateActivities.map(activity => (
                                        <li
                                            key={activity.id}
                                            className="activity-item-card"
                                            onContextMenu={(e) => {
                                                e.stopPropagation();
                                                handleContextMenu(e, activity.id);
                                            }}
                                        >
                                            <div className="item-content">
                                                <div className="item-title-row">
                                                    <span className="item-text">{activity.text}</span>
                                                </div>
                                                {activity.description && (
                                                    <span
                                                        className="item-description"
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: '#666',
                                                            margin: '4px 0',
                                                            lineHeight: '1.4'
                                                        }}
                                                    >
                                                        {activity.description}
                                                    </span>
                                                )}
                                                <div className="item-meta">
                                                    {activity.activityDate !== '9999-12-31' && (
                                                        <span>
                                                            📅 Date: {formatDueDate(activity.activityDate)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="activity-data">
                                                    {activity.type === 'cardio' ? (
                                                        <div>
                                                            <div><span>Type: Cardio</span></div>
                                                            <div><span>Distance: {activity.distance}km</span></div>
                                                            <div><span>Time: {activity.duration}</span></div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div><span>Type: GYM </span></div>
                                                            {(activity.exercises || []).map((exercise, index) => (
                                                                <div key={index}>
                                                                    <div><span>Exercise: {exercise.name}</span></div>
                                                                    {(exercise.sets || []).map((set, index2) => (
                                                                        <div key={index2}>
                                                                            <span>{set.weight} x{set.reps}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-back"
                                                    onClick={() => applyTemplate(activity)}
                                                >
                                                    Use Template
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="activity-form">
                    {pageTab !== 'Templates' && (
                        <div>
                            <ul className="activity-list-styled">
                                {activities.map(activity => (
                                    <li
                                        key={activity.id}
                                        className="activity-item-card"
                                        onContextMenu={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, activity.id);
                                        }}
                                    >
                                        <div className="item-content">
                                            {editingId === activity.id ? (
                                                <div className="edit-mode-container">
                                                    <input
                                                        className="edit-input-styled"
                                                        value={editText}
                                                        autoFocus
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                    />
                                                    <textarea
                                                        className="edit-desc-textarea"
                                                        placeholder="Add a description..."
                                                        value={editDesc}
                                                        onChange={(e) => setEditDesc(e.target.value)}
                                                    />

                                                    <div className="item-meta-edit">
                                                        <input
                                                            type="date"
                                                            className="edit-date-mini"
                                                            defaultValue={
                                                                activity.activityDate === '9999-12-31'
                                                                    ? ''
                                                                    : activity.activityDate
                                                            }
                                                            onChange={(e) => saveEdit(activity.id, {
                                                                activityDate: e.target.value || '9999-12-31'
                                                            })}
                                                        />
                                                    </div>

                                                    <div className="activity-data">
                                                        {activity.type === 'cardio' ? (
                                                            <div>
                                                                <span>Type: Cardio</span>
                                                                <input
                                                                    className="input-field-styled"
                                                                    value={editDistance}
                                                                    onChange={(e) => setEditDistance(e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                />
                                                                <input
                                                                    className="input-field-styled"
                                                                    value={editTime}
                                                                    onChange={(e) => setEditTime(e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span>Type: Gym </span>
                                                                {editExercises.map((exercise, index) => (
                                                                    <div key={index}>
                                                                        <input
                                                                            className="input-field-styled"
                                                                            value={exercise.name}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setEditExercises(prev => prev.map((ex, i) =>
                                                                                    i === index ? { ...ex, name: val } : ex
                                                                                ));
                                                                            }}
                                                                            onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                        />
                                                                        {(exercise.sets || []).map((set, index2) => (
                                                                            <div key={index2}>
                                                                                <input
                                                                                    className="input-field-styled"
                                                                                    value={set.weight}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        setEditExercises(prev => prev.map((ex, i) =>
                                                                                            i !== index ? ex : {
                                                                                                ...ex,
                                                                                                sets: ex.sets.map((s, j) =>
                                                                                                    j === index2 ? { ...s, weight: val } : s
                                                                                                )
                                                                                            }
                                                                                        ));
                                                                                    }}
                                                                                    onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                                />
                                                                                <input
                                                                                    className="input-field-styled"
                                                                                    value={set.reps}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        setEditExercises(prev => prev.map((ex, i) =>
                                                                                            i !== index ? ex : {
                                                                                                ...ex,
                                                                                                sets: ex.sets.map((s, j) =>
                                                                                                    j === index2 ? { ...s, reps: val } : s
                                                                                                )
                                                                                            }
                                                                                        ));
                                                                                    }}
                                                                                    onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <span
                                                            className="done-text"
                                                            onClick={() => saveEdit(activity.id)}
                                                        >
                                                            Done
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    onDoubleClick={() => startEdit(activity)}
                                                    title="Double click to edit"
                                                >
                                                    <div className="item-title-row">
                                                        <span className="item-text">{activity.text} </span>
                                                        {activity.isTemplate === true ? (
                                                            <button
                                                                type="button"
                                                                className="btn-heart"
                                                                onClick={() => changeTemplate(activity.id, false)}
                                                            >
                                                                ❤️
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="btn-heart"
                                                                onClick={() => changeTemplate(activity.id, true)}
                                                            >
                                                                🤍
                                                            </button>
                                                        )}
                                                    </div>
                                                    {activity.description && (
                                                        <span
                                                            className="item-description"
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                color: '#666',
                                                                margin: '4px 0',
                                                                lineHeight: '1.4'
                                                            }}
                                                        >
                                                            {activity.description}
                                                        </span>
                                                    )}
                                                    <div className="item-meta">
                                                        {activity.activityDate !== '9999-12-31' && (
                                                            <span>
                                                                📅 Date: {formatDueDate(activity.activityDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="activity-data">
                                                        {activity.type === 'cardio' ? (
                                                            <div>
                                                                <div><span>Type: Cardio</span></div>
                                                                <div><span>Distance: {activity.distance}km</span></div>
                                                                <div><span>Time: {activity.duration}</span></div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div><span>Type: GYM </span></div>
                                                                {(activity.exercises || []).map((exercise, index) => (
                                                                    <div key={index}>
                                                                        <div><span>Exercise: {exercise.name}</span></div>
                                                                        {(exercise.sets || []).map((set, index2) => (
                                                                            <div key={index2}>
                                                                                <span>{set.weight} x{set.reps}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {menuPos && (
                <div
                    className="custom-context-menu"
                    style={{ top: menuPos.y, left: menuPos.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="menu-item delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteActivity(menuPos.id);
                            setMenuPos(null);
                        }}
                    >
                        🗑️ Delete Activity
                    </div>
                </div>
            )}
        </div>
    );
}

export default PhysicalActivity;