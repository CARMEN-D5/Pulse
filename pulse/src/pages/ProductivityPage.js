import React, { useState } from 'react';
import { DOMAINS } from '../scoring/scoringEngine';
import { logReflection, logAction } from '../firestore/scoring';
import TodoList from './TodoList';
import './auth.css';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

function RatingPicker({ value, onChange }) {
  return (
    <div className="rating-picker">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`rating-btn${value === n ? ' rating-btn--active' : ''}`}
          onClick={() => onChange(n)}
          aria-label={`${n} – ${RATING_LABELS[n]}`}
        >
          <span className="rating-num">{n}</span>
          <span className="rating-label">{RATING_LABELS[n]}</span>
        </button>
      ))}
    </div>
  );
}

function ProductivityPage({ domainScore, user, onBack, onActivityLogged }) {
  const domain = DOMAINS.productivity;

  const [rating, setRating] = useState(0);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);
  const [actionsDone, setActionsDone] = useState([]);

  const [error, setError] = useState(null);
  const [showTodoList, setShowTodoList] = useState(false);

  const handleLogReflection = async () => {
    setReflectionLoading(true);
    setError(null);
    const result = await logReflection(user.uid, 'productivity', rating);
    if (result.ok) {
      setReflectionDone(true);
      onActivityLogged?.();
    } else {
      setError(result.error);
    }
    setReflectionLoading(false);
  };

  const handleLogAction = async (actionType) => {
    setActionLoading(actionType);
    setError(null);
    const result = await logAction(user.uid, 'productivity', actionType);
    if (result.ok) {
      setActionsDone(prev => [...prev, actionType]);
      onActivityLogged?.();
    } else {
      setError(result.error);
    }
    setActionLoading(null);
  };

  if (showTodoList) {
    return <TodoList user={user} onBack={() => setShowTodoList(false)} />;
  }

  return (
    <div className="home-shell">
      <div className="domain-page-container">

        {/* Header */}
        <div className="domain-page-header">
          <button type="button" className="btn btn-ghost domain-back-btn" onClick={onBack}>
            ← Back
          </button>
          <div className="domain-page-title">
            <span className="domain-page-icon" aria-hidden="true">{domain.icon}</span>
            <div>
              <h1 className="domain-page-name">{domain.label}</h1>
              {domainScore != null && (
                <p className="domain-page-score">
                  Current score: <strong>{Math.round(domainScore)}</strong> / 100
                </p>
              )}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Reflection section */}
        <div className="domain-section">
          <h2 className="domain-section-title">Daily Check-in</h2>
          <p className="domain-section-prompt">{domain.reflectionPrompt}</p>

          {reflectionDone ? (
            <div className="alert alert-success">
              Check-in logged! Your reflection score has been updated.
            </div>
          ) : (
            <>
              <RatingPicker value={rating} onChange={setRating} />
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                disabled={rating === 0 || reflectionLoading}
                onClick={handleLogReflection}
              >
                {reflectionLoading ? 'Saving…' : 'Log check-in'}
              </button>
            </>
          )}
        </div>

        {/* Actions section */}
        <div className="domain-section">
          <h2 className="domain-section-title">Log an Action</h2>
          <p className="domain-section-sub">
            Each action earns points toward your weekly action score.
          </p>

          <div className="action-list">
            {Object.entries(domain.actions).map(([type, action]) => {
              const done = actionsDone.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`action-btn${done ? ' action-btn--done' : ''}`}
                  disabled={actionLoading === type}
                  onClick={() => handleLogAction(type)}
                >
                  <span className="action-btn-label">{action.label}</span>
                  <span className="action-btn-points">
                    {done ? '✓ logged' : `+${action.points} pts`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Todo List shortcut */}
        <div className="domain-section">
          <h2 className="domain-section-title">Task Manager</h2>
          <p className="domain-section-sub">
            Manage your daily tasks and to-do list.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => setShowTodoList(true)}
          >
            📋 Open To-Do List
          </button>
        </div>

      </div>
    </div>
  );
}

export default ProductivityPage;
