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
import "./TodoList.css";

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
function TodoList({ user, onBack }) {
    const [todos, setTodos] = useState([]);
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

    // 1. Listen to Firestore
    // Subscribe to this user's todo collection, ordered by most recent.
    // This ensures the UI stays in sync without manual refreshing.
    useEffect(() => {
        if (!user) return;

        const todoRef = collection(db, 'users', user.uid, 'todos');
        const q = query(todoRef, orderBy('dueDate', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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


    const filteredTodos = todos.filter(todo => {
        if (tab === 'pending') return todo.completed === false;
        if (tab === 'completed') return todo.completed === true;
        return true;
    });

    const startEdit = (todo) => {
        setMenuPos(null);
        setEditingId(todo.id);
        setEditText(todo.text);
        setEditDesc(todo.description||'');
    };

    const saveEdit = async (id, updatedFields = {}) => {
        const finalFields = {
            text:editText,
            description:editDesc,
            ...updatedFields
        };
        if (finalFields.text && finalFields.text.trim() === "") {
            setEditingId(null);
            return;
        }
        try{
            setError(null);
            const todoRef = doc(db, 'users', user.uid, 'todos', id);
            await updateDoc(todoRef, finalFields);
            if(Object.keys(updatedFields).length === 0){
                setEditingId(null);
            }
        }catch (err){
            console.err("Save error", err);
            setError("Could not update task. Please try again.");
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

    const closeAll = () => {
        setEditingId(null);
        setMenuPos(null);
    };

    // 2. create tasks
    // Add a new task to Firestore.
    // Use serverTimestamp to ensure consistent sorting across time zones.
    const addTodo = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        try{
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
        }catch(err){
            console.error("Add error:", err);
            setError("Failed to add task. Please try again.");
        }

    };

    // 3. update
    // Update the 'completed' field.
    // This state change is reflected instantly in the UI via the onSnapshot listener.
    const toggleComplete = async (todo) => {
        try{
            setError(null);
            const todoRef = doc(db, 'users', user.uid, 'todos', todo.id);
            await updateDoc(todoRef, {
                completed: !todo.completed
            });
        }catch(err){
            console.error("Toggle error:", err);
            setError("Failed to update status.");
        }

    };

    // 4. delete task
    const deleteTodo = async (id) => {
        try{
            setError(null);
            await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
        }catch (err){
            console.error("Delete error:", err);
            setError("Could not delete task.");
        }
    };

    return (
        <div className="todo-shell">
            {error && (
                <div className="error-banner" onClick={() => setError(null)}>
                    ⚠️ {error} <span className="close-error">×</span>
                </div>
            )}
            <div className="todo-container">
                <div className="todo-header">
                    <button onClick={onBack} className="btn-back">
                        Back
                    </button>
                    <h2 className="todo-title">My to-do list</h2>
                </div>

                <div className="todo-form-card">
                    <form onSubmit={addTodo} className="todo-input-group">
                        <input
                            className="input-field-styled"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="New task..."
                            style={{ flex: 1, padding: '8px' }}
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
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                            <select
                                value={priority}
                                className="input-field-styled"
                                style={{ width: 'auto' }}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="High">🔴 High</option>
                                <option value="Medium">🟠 Medium</option>
                                <option value="Low">🟢 Low</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-teal">Add</button>
                    </form>
                </div>

                <div className="todo-tabs-card">
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

                <ul className="todo-list-styled">
                    {filteredTodos.map(todo => (
                        <li key={todo.id}
                            className="todo-item-card"
                            onContextMenu={(e) => {
                                e.stopPropagation();
                                handleContextMenu(e, todo.id);
                            }}
                        >
                            <div className="checkbox-wrapper"
                                 onClick={() => toggleComplete(todo)}>
                                <div className={`custom-checkbox ${todo.completed? 'checked': ''}`}>
                                    {todo.completed && "✓"}
                                </div>
                            </div>

                            <div className="item-content">
                                {editingId === todo.id ? (
                                    <div className="edit-mode-container">
                                        <input
                                            className="edit-input-styled"
                                            value={editText}
                                            autoFocus
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, todo.id)}
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
                                                value={todo.priority}
                                                onChange={(e) => saveEdit(todo.id, {priority : e.target.value})}
                                                style={{
                                                    borderLeft: `4px solid ${
                                                        todo.priority === 'High' ? '#c9184a' :
                                                            todo.priority === 'Medium' ? '#f57c00' : '#2d6a4f'
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
                                                defaultValue={todo.dueDate === "9999-12-31" ? "" : todo.dueDate}
                                                onChange={(e) => saveEdit(todo.id, {dueDate: e.target.value || "9999-12-31"})}
                                            />

                                            <span className="done-text" onClick={() => saveEdit(todo.id)}>
                                                Done
                                            </span>
                                        </div>
                                    </div>
                                ):(
                                    <div onDoubleClick={() => startEdit(todo)} title="Double click to edit">
                                        <span
                                            className="item-text" style={{
                                            textDecoration: todo.completed ? 'line-through' : 'none',
                                            color: todo.completed ? '#aaa' : '#1a5e5a'
                                        }}>
                                            {todo.text}
                                        </span>
                                        {todo.description && (
                                            <p className="item-description"
                                               style={{
                                                   fontSize:'0.85rem',
                                                   color:'#666',
                                                   margin:'4px 0',
                                                   lineHeight: '1.4'
                                               }}>
                                                {todo.description}
                                            </p>
                                        )}
                                        <div className="item-meta">
                                            <span style={{
                                                color: todo.priority === 'High' ? '#c9184a' : '#1a827d',
                                                fontWeight: 'bold'}}>
                                                {todo.priority === 'High' ? ' 🔴 HIGH' : (todo.priority === 'Medium' ? ' 🟠 Medium' : ' 🟢 Low')}
                                            </span>
                                            {todo.dueDate !== "9999-12-31" && (
                                                <span>📅 Due: {todo.dueDate}</span>
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
                            deleteTodo(menuPos.id);
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

export default TodoList;