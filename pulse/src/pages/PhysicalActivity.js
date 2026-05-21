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
import { logAction } from '../firestore/scoring';



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




function PhysicalActivity({ user, onBack, onActivityLogged}){
//     State
    const [activities, setActivities] = useState([]);
    const [input, setInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [activityDate, setActivityDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [tab, setTab] = useState('pending');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [menuPos, setMenuPos] = useState(null);
    const [error, setError] = useState(null);

    const [distance, setDistance] = useState('');
    const [editDistance, setEditDistance] = useState('');
    const [time, setTime] = useState('');
    const [editTime, setEditTime] = useState('');


    // Load Activities from firebase
    useEffect(() => {
        if (!user) return;

        const activityRef = collection(db, 'users', user.uid, 'physicalActivities')
        const q = query(activityRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        const handleGlobalClick = () => {
            setMenuPos(null)
        };
        window.addEventListener('click', handleGlobalClick);

        return () => {
            window.removeEventListener('click', handleGlobalClick);
        };
    }, []);

    const startEdit = (activity) => {
        setMenuPos(null);
        setEditingId(activity.id);
        setEditText(activity.text)
        setEditDesc(activity.description||'');
        setEditDistance(activity.distance)
        setEditTime(activity.duration)
        setEditExercises(activity.exercises)
    }

    const saveEdit = async (id, updateFields = {}) => {
        const activity = activities.find(activity => activity.id === id);

        let finalFields = {
            text:editText,
            description:editDesc,
            distance:editDistance,
            duration:editTime,
            exercises: editExercises,
            ...updateFields
        }
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
        try{
            setError(null);
            const activityRef = doc(db, 'users', user.uid, 'physicalActivities', id);
            await updateDoc(activityRef, finalFields);
            if(Object.keys(updateFields).length === 0){
                setEditingId(null);
            }
        }catch (err){
            console.error("Save error", err);
            setError("Could not update Activity. Please try again");
        }
    };

    const handleKeyDown = (e, id) => {
        if (e.key === 'Enter') {
            saveEdit(id)
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleContextMenu = (e, id) => {
        e.preventDefault();
        setMenuPos({ x: e.pageX, y: e.pageY, id: id });
    };

    // Create Activity
    const addActivity = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try{
            setError(null);
            if (tab === 'cardio') {
                await addDoc(collection(db, 'users', user.uid, 'physicalActivities'), {
                    text: input,
                    description: descInput,
                    type: tab,
                    distance: distance,
                    duration: time,
                    exercises: [],
                    activityDate: activityDate,
                    createdAt: serverTimestamp(),
                });
            }
            else {
                await addDoc(collection(db, 'users', user.uid, 'physicalActivities'), {
                    text: input,
                    description: descInput,
                    type: tab,
                    distance: 0,
                    duration: 0,
                    exercises: exercises,
                    activityDate: activityDate,
                    createdAt: serverTimestamp(),
                });
            }
            setInput('');
            setDescInput('');
            setActivityDate('');
            setTab('')
            setDistance('')
            setTime('')
            setExercises([
                {
                    name: '',
                    sets: [{ weight: '', reps: '' }]
                }
            ]);

            // Score: log exercise action for the health domain
            logAction(user.uid, 'health', 'exercise');
            if (onActivityLogged) onActivityLogged();
        }catch(err){
            console.error("Add error", error);
            setError("Failed to add task. Please try again.");
        }
    };

//    delete
    const deleteActivity = async (id) => {
        try{
            setError(null);
            await deleteDoc(doc(db, 'users', user.uid, 'physicalActivities', id));
        } catch (err){
            console.error("Delete error:", err)
            setError("Could not delete task.")
        }
    };

    const [exercises, setExercises] = useState([
        {
            name: '',
            sets: [{ weight: '', reps: '' }]
        }
    ]);

    const [editExercises, setEditExercises] = useState([
            {
                name: '',
                sets: [{ weight: '', reps: '' }]
            }
        ]);

    const addExercise = () => {
        setExercises([
            ...exercises,
            {
                name: '',
                sets: [{weight: '', reps: ''}]
            }
        ]);
    };

    const addSet = (exerciseIndex) => {
        const updated = [...exercises];

        if (!updated[exerciseIndex]) return;

        updated[exerciseIndex].sets.push({
            weight: '',
            reps: ''
        });

        setExercises(updated);
    };

    const removeSet = (exerciseIndex) =>{
        const updated = [...exercises];
        const sets = updated[exerciseIndex].sets;

        if (!sets || sets.length === 0) return;

        updated[exerciseIndex] = {
            ...updated[exerciseIndex],
            sets: sets.slice(0, -1)
        };

        setExercises(updated)
    }

    return (
        <div className="activity-shell">
            {error && (
                <div className="error-banner" onClick={() => setError(null)}>
                    ⚠️ {error} <span className="close-error">×</span>
                </div>
            )}
            <div className="activity-container">
                <div className="activity-header">
                    <button onClick={onBack} className="btn-back" type='back'>
                        Back
                    </button>
                    <h2 className="activity-title">My Physical Activities</h2>
                </div>

                <div className="activity-form-card">
                    <form onSubmit={addActivity} className="activity-input-group">
                        <input
                            className="input-field-styled"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="New Activity..."
                            style={{ flex: 1, padding: '8px'}}
                        />
                        <textarea
                            className="input-field-styled"
                            value={descInput}
                            onChange={(e) => setDescInput(e.target.value)}
                            placeholder="Add a description(optional)..."
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

                        <div className='activity-tabs-card'>
                            {['cardio', 'strength'].map(t => (
                                <button
                                    key={t}
                                    className={`tab-btn ${tab === t ? 'active' : ''}`}
                                    onClick={() => setTab(t)}
                                    type="button"
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>


                        <div className="activity-form">
                            {tab === 'cardio' && (
                                <div>
                                    <input
                                        className="input-field-styled"
                                        value={distance}
                                        onChange={(e) => setDistance(e.target.value)}
                                        placeholder="Distance (km)"
                                        style={{ flex: 1, padding: '8px'}}
                                    />
                                    <input
                                        className="input-field-styled"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        placeholder="Duration (HH:MM)"
                                        style={{ flex: 1, padding: '8px'}}
                                    />
                                </div>
                            )}

                            {tab === 'strength' && (
                                <div>
                                    {exercises.map((exercise, index) => (
                                        <div key={index} className="exercise-card">

                                            <input
                                                className="input-field-styled"
                                                placeholder="Exercise"
                                                style={{ flex: 1, padding: '8px'}}
                                                value={exercise.name}
                                                onChange={(e) => {
                                                    const updated = [...exercises];
                                                    updated[index].name = e.target.value;
                                                    setExercises(updated);
                                                }}
                                            />

                                            {exercise.sets.map((set, index2) => (
                                                <div key={index2} className="set-card">
                                                    <input
                                                        className="input-field-styled"
                                                        placeholder="weight"
                                                        style={{ flex: 1, padding: '8px'}}
                                                        value={set.weight}
                                                        onChange={(e) => {
                                                            const updated = [...exercises];
                                                            updated[index].sets[index2].weight = e.target.value;
                                                            setExercises(updated);
                                                        }}
                                                    /> kg
                                                    <input
                                                        className="input-field-styled"
                                                        placeholder="reps"
                                                        style={{ flex: 1, padding: '8px'}}
                                                        value={set.reps}
                                                        onChange={(e) => {
                                                            const updated = [...exercises];
                                                            updated[index].sets[index2].reps = e.target.value;
                                                            setExercises(updated);
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

                <ul className="activity-list-styled">
                    {activities.map(activity => {
                        return(
                            <li key={activity.id}
                                className="activity-item-card"
                                onContextMenu={(e) => {
                                    e.stopPropagation();
                                    handleContextMenu(e,activity.id);
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
                                                    type = "date"
                                                    className="edit-date-mini"
                                                    defaultValue={activity.activityDate === "9999-12-31" ? "" : activity.activityDate}
                                                    onChange={(e) => saveEdit(activity.id, {dueDate: e.target.value || "9999-12-31"})}
                                                />
                                            </div>
                                            <div className="activity-data">
                                                {activity.type === "cardio" ? (
                                                    <div>
                                                        <span>Type: Cardio</span>
                                                        <input
                                                            className="input-field-styled"
                                                            value={editDistance}
                                                            autoFocus
                                                            onChange={(e) => setEditDistance(e.target.value)}
                                                            onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                            />
                                                        <input
                                                            className="input-field-styled"
                                                            value={editTime}
                                                            autoFocus
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
                                                                     autoFocus
                                                                     onChange={(e) =>{
                                                                        const updated = [...editExercises];
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            name: e.target.value
                                                                        };
                                                                        setEditExercises(updated);
                                                                     }}
                                                                     onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                     />
                                                                 {exercise.sets.map((set, index2) =>
                                                                    <div key={index2}>
                                                                        <input
                                                                            className="input-field-styled"
                                                                            value={set.weight}
                                                                            autoFocus
                                                                            onChange={(e) => {
                                                                                const updated = [...editExercises];
                                                                                updated[index] = {
                                                                                    ...updated[index],
                                                                                    sets: updated[index].sets.map((s, i) =>
                                                                                        i === index2
                                                                                        ? {...s, weight: e.target.value }
                                                                                        : s
                                                                                    )
                                                                                };
                                                                                setEditExercises(updated);
                                                                            }}
                                                                            onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                            />
                                                                        <input
                                                                            className="input-field-styled"
                                                                            value={set.reps}
                                                                            autoFocus
                                                                            onChange={(e) => {
                                                                                const updated = [...editExercises];
                                                                                updated[index] = {
                                                                                    ...updated[index],
                                                                                    sets: updated[index].sets.map((s, i) =>
                                                                                        i === index2
                                                                                        ? {...s, reps: e.target.value }
                                                                                        : s
                                                                                    )
                                                                                };
                                                                                setEditExercises(updated);
                                                                            }}
                                                                            onKeyDown={(e) => handleKeyDown(e, activity.id)}
                                                                            />
                                                                    </div>
                                                                 )}
                                                             </div>
                                                         ))}
                                                     </div>
                                                )}

                                                <span className="done-text" onClick={() => saveEdit(activity.id)}>
                                                     Done
                                                </span>
                                            </div>

                                        </div>
                                    ):(
                                        <div onDoubleClick={() => startEdit(activity)} title="Double click to edit">
                                            <div className="item-title-row">
                                                <span
                                                    className="item-text"
                                                >
                                                    {activity.text}
                                                </span>
                                            </div>
                                            {activity.description && (
                                                <span className="item-description"
                                                   style={{
                                                       fontSize:'0.85rem',
                                                       color:'#666',
                                                       margin:'4px 0',
                                                       lineHeight: '1.4'
                                                   }}>
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
                                                        {activity.exercises.map((exercise, index) => (
                                                            <div key={index}>
                                                                <div><span>Exercise: {exercise.name}</span></div>
                                                                {exercise.sets.map((set, index2) =>
                                                                    <div><span>{set.weight} x{set.reps}</span></div>

                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                )}
                                            </div>


                                        </div>
                                    )
                                }
                                </div>
                            </li>
                        )
                    })}

                </ul>
            </div>

            {menuPos && (
                <div
                    className="custom-context-menu"
                    style={{ top: menuPos.y, left: menuPos.x}}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="menu-item delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteActivity(menuPos.id)
                            setMenuPos(null);
                        }}
                    >
                        🗑️ Delete Task
                    </div>
                </div>
            )}
        </div>
    );
}

export default PhysicalActivity;