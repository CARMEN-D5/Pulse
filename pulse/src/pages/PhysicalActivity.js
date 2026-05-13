import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
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




function PhysicalActivity({ user, onBack}){
//     State
    const [activities, setActivities] = useState([]);
    const [input, setInput] = useState('');
    const [descInput, setDescInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [tab, setTab] = useState('pending');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [menuPos, setMenuPos] = useState(null);
    const [error, setError] = useState(null);

    // Load Activities from firebase
    useEffect(() => {
        if (!user) return;

        const activityRef = collection(db, 'users', user.uid, 'physicalActivities')
        const q = query(activityRef, orderBy('dueDate', 'asc'));

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


    //  todo maybe remove
    const filteredActivities = activities.filter(activity => {
        if (tab === 'pending') return activity.completed === false;
        if (tab === 'completed') return activity.completed === true;
        return true;
    })

    const startEdit = (activity) => {
        setMenuPos(null);
        setEditingId(activity.id);
        setEditText(activity.txt)
        setEditDesc(activity.description||'');
    }

    // TODO update save
    const saveEdit = async (id, updateFields = {}) => {
        const finalFields = {
            text:editText,
            description:editDesc,
            ...updateFields
        };
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

    // TODO remove

    const toggleComplete = async (todo) => {

    }


    // TODO update add
    // Create Activity
    const addActivity = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try{
            setError(null);
            await addDoc(collection(db, 'users', user.uid, 'physicalActivities'), {
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

    return (
        <div className="activity-shell">
            {error && (
                <div className="error-banner" onClick={() => setError(null)}>
                    ⚠️ {error} <span className="close-error">×</span>
                </div>
            )}
            <div className="activity-container">
                <div className="activity-header">
                    <button onClick={onBack} className="btn-back">
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
//                        TODO Change input system
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
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                            <select
                                value={priority}
                                className="input-field-styled"
                                style={{ width: 'auto' }}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="High"> High </option>
                                <option value="Medium"> Medium </option>
                                <option value="Low"> Low </option>
                            </select>
                        </div>

                        <div className='activity-tabs-card'>
                            {['cardio', 'strength'].map(t => (
                                <button
                                    key={t}
                                    className={`tab-btn ${tab === t ? 'active' : ''}`}
                                    onClick={() => setTab(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button type="submit" className="btn-teal">Add</button>
                    </form>
                </div>

//              TODO change tabs as part of form??
                <div className='todo-tabs-card'>
                    {['pending', 'completed', 'all'].map(t => (
                        <button
                            key={t}
                            className={`tab-btn ${tab === t ? 'active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                <ul className="activity-list-styled">
                    {filteredActivities.map(activity => (
                        <li key={activity.id}
                            className="activity-item-card"
                            onContextMenu={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, activity.id)
                            }}
                        >
                            <div className="checkbox-wrapper">
                                onClick={() => toggleComplete(activity)}
                            >
                                <div className={`custom-checkbox ${activity.completed? 'checked': ''}`}>
                                    {activity.completed && "✓"}
                                </div>
                            </div>

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
                                            <select
                                                className="edit-select-mini"
                                                value={activity.priority}
                                                onChange={(e) => saveEdit(activity.id, {priority : e.target.value})}
                                                style={{
                                                    borderLeft: `4px solid ${
                                                        activity.priority === 'High' ? '#c9184a' :
                                                            activity.priority === 'Medium' ? '#f57c00' : '#2d6a4f'
                                                    }`
                                                }}
                                            >
                                                <option value="High">🔴 High</option>
                                                <option value="Medium">🟠 Medium</option>
                                                <option value="Low">🟢 Low</option>
                                            </select>

                                            <input
                                                type = "date"
                                                className="edit-date-mini"
                                                defaultValue={activity.dueDate === "9999-12-31" ? "" : activity.dueDate}
                                                onChange={(e) => saveEdit(activity.id, {dueDate: e.target.value || "9999-12-31"})}
                                            />
                                            <span className="done-text" onClick={() => saveEdit(activity.id)}>
                                                Done
                                            </span>
                                        </div>
                                    </div>
                                ):(
                                    <div onDoubleClick={() => startEdit(activity)} title="Double click to edit">
                                        <span
                                            className="item-text" style={{
                                            textDecoration: activity.completed ? 'line-though' : 'none',
                                            color: activity.completed ? "#aaa" : '#1a5e5a'
                                        }}>
                                            {activity.text}
                                        </span>
                                        {activity.description && (
                                            <p className="item-description"
                                                style={{
                                                    fontSize:'0.85rem',
                                                    color:'#666',
                                                    margin:'4px 0',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {activity.description}
                                            </p>
                                        )}
                                        <div className="item-meta">
                                            <span style={{
                                                color: activity.priority === 'High' ? '#c9184a' : '#1a827d',
                                                fontWeight: 'bold'}}>
                                                {activity.priority === 'high' ?  '🔴 HIGH' : (activity.priority === 'Medium' ? ' 🟠 Medium' : ' 🟢 Low')}
                                            </span>
                                            {activity.dueDate !== "9999-12-31" && (
                                                <span>📅 Due: {activity.dueDate}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
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





//    return (
//        <div className="health-page">
//          <h1>Welcome to the health page</h1>
//          <p>This is where your health content will go.</p>
//        </div>
//    );
}

export default PhysicalActivity;