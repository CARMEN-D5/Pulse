import React, { useEffect, useMemo, useState } from "react";
import "./auth.css";

import DonutChart from "./DonutChart";
import {
  DEFAULT_CATEGORIES,
  categoryById,
  addExpense,
  listExpenses,
  deleteExpense,
  getBudgets,
  setBudget,
  monthBounds,
  monthLabel,
} from "../firestore/finance";

/**
 * Finance / budget tracker page.
 *
 * Layout:
 *   - Header with back button + month
 *   - Donut chart (this-month spending breakdown) + legend
 *   - Per-category progress bars vs each budget cap
 *   - Add expense form (amount, category chips, optional note + date)
 *   - Recent transactions list with delete
 *   - Edit budgets modal (cog icon)
 */
function Finance({ user, onBack }) {
  const uid = user?.uid;

  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({}); // { category: { monthlyLimit } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showBudgetModal, setShowBudgetModal] = useState(false);

  const { monthStart, monthEnd } = useMemo(() => monthBounds(), []);
  const monthName = useMemo(() => monthLabel(), []);

  // ---- load --------------------------------------------------------------
  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    setError("");
    const [exp, bud] = await Promise.all([
      listExpenses(uid, { monthStart, monthEnd }),
      getBudgets(uid),
    ]);
    if (!exp.ok) setError(exp.error || "Could not load expenses.");
    if (!bud.ok) setError(bud.error || "Could not load budgets.");
    setExpenses(exp.data || []);
    setBudgets(bud.data || {});
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ---- aggregations ------------------------------------------------------
  const spentByCategory = useMemo(() => {
    const out = {};
    for (const c of DEFAULT_CATEGORIES) out[c.id] = 0;
    for (const e of expenses) {
      out[e.category] = (out[e.category] || 0) + (e.amount || 0);
    }
    return out;
  }, [expenses]);

  const totalSpent = useMemo(
    () => Object.values(spentByCategory).reduce((a, b) => a + b, 0),
    [spentByCategory]
  );

  const totalBudget = useMemo(
    () =>
      DEFAULT_CATEGORIES.reduce(
        (acc, c) => acc + (budgets[c.id]?.monthlyLimit || 0),
        0
      ),
    [budgets]
  );

  const donutData = useMemo(
    () =>
      DEFAULT_CATEGORIES.filter((c) => spentByCategory[c.id] > 0).map((c) => ({
        id: c.id,
        label: c.label,
        value: spentByCategory[c.id],
        color: c.color,
      })),
    [spentByCategory]
  );

  // ---- handlers ----------------------------------------------------------
  const handleAddExpense = async (payload) => {
    const res = await addExpense(uid, payload);
    if (!res.ok) {
      setError(res.error || "Couldn't save the expense.");
      return false;
    }
    await refresh();
    return true;
  };

  const handleDelete = async (id) => {
    const res = await deleteExpense(uid, id);
    if (!res.ok) setError(res.error || "Couldn't delete that.");
    await refresh();
  };

  const handleSaveBudgets = async (next) => {
    // next: { category: monthlyLimit }
    const writes = Object.entries(next).map(([cat, lim]) =>
      setBudget(uid, cat, lim)
    );
    const results = await Promise.all(writes);
    const fail = results.find((r) => !r.ok);
    if (fail) {
      setError(fail.error || "Couldn't save budgets.");
    }
    setShowBudgetModal(false);
    await refresh();
  };

  // ---- render ------------------------------------------------------------
  return (
    <div className="finance-shell">
      <div className="finance-container">
        <div className="finance-header">
          <button type="button" className="finance-back" onClick={onBack}>
            ← Home
          </button>
          <div className="finance-title-block" style={{ flex: 1 }}>
            <h1>Budget</h1>
            <div className="month-label">{monthName}</div>
          </div>
          <button
            type="button"
            className="cog-btn"
            onClick={() => setShowBudgetModal(true)}
            aria-label="Edit budgets"
            title="Edit budgets"
          >
            ⚙️
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        {/* ---------- Chart + legend ---------- */}
        <div className="finance-card">
          <div className="finance-summary">
            <DonutChart
              data={donutData}
              size={220}
              thickness={28}
              centerLabel={`$${totalSpent.toFixed(0)}`}
              centerSub={
                totalBudget > 0
                  ? `of $${totalBudget.toFixed(0)}`
                  : "spent this month"
              }
            />
            <div className="donut-legend">
              {DEFAULT_CATEGORIES.map((c) => (
                <div className="legend-row" key={c.id}>
                  <span
                    className="legend-swatch"
                    style={{ background: c.color }}
                  />
                  <span>
                    {c.icon} {c.label}
                  </span>
                  <span className="legend-amount">
                    ${spentByCategory[c.id].toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Per-category bars ---------- */}
        <div className="finance-card">
          <div className="section-title">Category limits</div>
          <div className="budget-rows">
            {DEFAULT_CATEGORIES.map((c) => {
              const cap = budgets[c.id]?.monthlyLimit || 0;
              const spent = spentByCategory[c.id];
              const ratio = cap > 0 ? spent / cap : 0;
              const pct = Math.min(ratio, 1) * 100;
              const cls = ratio >= 1 ? "over" : ratio >= 0.8 ? "warn" : "";
              return (
                <div key={c.id} className="budget-row">
                  <div className="budget-row-head">
                    <span className="budget-row-name">
                      <span aria-hidden="true">{c.icon}</span>
                      {c.label}
                    </span>
                    <span className="budget-row-amount">
                      ${spent.toFixed(0)}
                      {cap > 0 ? ` / $${cap.toFixed(0)}` : " · no budget set"}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${cls}`}
                      style={{
                        width: `${pct}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- Add expense ---------- */}
        <div className="finance-card">
          <div className="section-title">Add an expense</div>
          <AddExpenseForm onSubmit={handleAddExpense} />
        </div>

        {/* ---------- Recent transactions ---------- */}
        <div className="finance-card">
          <div className="section-title">Recent transactions</div>
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              No expenses yet — add one above to get started.
            </div>
          ) : (
            <div className="tx-list">
              {expenses.slice(0, 12).map((e) => {
                const cat = categoryById(e.category);
                const date = e.date?.toDate
                  ? e.date.toDate()
                  : new Date(e.date);
                return (
                  <div key={e.id} className="tx-row">
                    <div
                      className="tx-icon"
                      style={{ background: cat.color + "22" }}
                    >
                      {cat.icon}
                    </div>
                    <div className="tx-main">
                      <div className="tx-cat">{cat.label}</div>
                      <div className="tx-meta">
                        {date.toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                        {e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    <div className="tx-amount">${e.amount.toFixed(2)}</div>
                    <button
                      type="button"
                      className="tx-delete"
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete expense"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showBudgetModal && (
        <BudgetModal
          initial={budgets}
          onSave={handleSaveBudgets}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Add expense sub-component
// ============================================================================

function AddExpenseForm({ onSubmit }) {
  const todayIso = useMemo(() => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }, []);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Number(amount) > 0 && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({
      amount: Number(amount),
      category,
      note,
      date,
    });
    setSubmitting(false);
    if (ok) {
      setAmount("");
      setNote("");
      setCategory("food");
      setDate(todayIso);
    }
  };

  return (
    <form className="add-expense" onSubmit={submit}>
      <input
        className="amount-input"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="$0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="category-chips" role="radiogroup" aria-label="Category">
        {DEFAULT_CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`chip ${category === c.id ? "selected" : ""}`}
            onClick={() => setCategory(c.id)}
            role="radio"
            aria-checked={category === c.id}
          >
            <span aria-hidden="true">{c.icon}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="field-row">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field-input"
          style={{
            padding: "10px 12px",
            border: "1px solid var(--pulse-border)",
            borderRadius: 10,
            fontSize: 14,
          }}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{
            padding: "10px 12px",
            border: "1px solid var(--pulse-border)",
            borderRadius: 10,
            fontSize: 14,
          }}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!canSubmit}
      >
        {submitting ? "Adding…" : "Add expense"}
      </button>
    </form>
  );
}

// ============================================================================
// Edit budgets modal
// ============================================================================

function BudgetModal({ initial, onSave, onClose }) {
  const [draft, setDraft] = useState(() => {
    const out = {};
    for (const c of DEFAULT_CATEGORIES) {
      out[c.id] = String(initial?.[c.id]?.monthlyLimit || "");
    }
    return out;
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const next = {};
    for (const k of Object.keys(draft)) {
      next[k] = Number(draft[k]) || 0;
    }
    await onSave(next);
    setSaving(false);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-label="Edit budgets">
        <h3>Monthly budgets</h3>
        <p
          style={{
            margin: 0,
            color: "var(--pulse-text-muted)",
            fontSize: 13,
          }}
        >
          Set the most you want to spend in each category each month.
        </p>

        {DEFAULT_CATEGORIES.map((c) => (
          <div key={c.id} className="budget-edit-row">
            <label htmlFor={`bud-${c.id}`}>
              <span aria-hidden="true">{c.icon}</span>
              {c.label}
            </label>
            <span style={{ color: "var(--pulse-text-muted)" }}>$</span>
            <input
              id={`bud-${c.id}`}
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              placeholder="0"
              value={draft[c.id]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [c.id]: e.target.value }))
              }
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ flex: 1 }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Finance;
