import React, { useEffect, useMemo, useState } from "react";
import "./auth.css";

import { logAction } from "../firestore/scoring";
import DonutChart from "./DonutChart";
import SpendingCalendar from "./SpendingCalendar";
import { ShareButton } from "../components/share";
import SavingView from "./SavingView";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
  categoryById,
  accountById,
  addExpense,
  listExpenses,
  deleteExpense,
  getBudgets,
  setBudget,
  getAccounts,
  saveAccount,
  deleteAccount,
  ensureDefaultAccounts,
  monthBounds,
  monthLabel,
  daysInMonth,
} from "../firestore/finance";

/**
 * Finance / budget tracker page.
 *
 * Layout (top -> bottom):
 *   - Header (back, title, share, settings cog)
 *   - Donut chart + legend (this-month spending split by category)
 *   - Spending P&L calendar (per-day vs daily allowance)
 *   - Per-category progress bars vs each budget cap
 *   - Add expense form (amount + category + account + date + note)
 *   - Recent transactions with delete
 *   - Settings modal: Budgets tab + Accounts tab
 *
 * SHARE PROMPT
 * achievement for prompt is staying under budget
 *
 * finance only uses manual share option/trigger as sharing budgeting might not
 * be appealing to users
 */
function Finance({ user, onBack, onActivityLogged }) {
  const uid = user?.uid;

  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({}); // { category: { monthlyLimit } }
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [financeTab, setFinanceTab] = useState("spending");

  const { monthStart, monthEnd } = useMemo(() => monthBounds(), []);
  const monthName = useMemo(() => monthLabel(), []);
  const monthDayCount = useMemo(() => daysInMonth(), []);

  // ---- load --------------------------------------------------------------
  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    setError("");
    // Seed default accounts on first visit. Idempotent.
    await ensureDefaultAccounts(uid);
    const [exp, bud, acc] = await Promise.all([
      listExpenses(uid, { monthStart, monthEnd }),
      getBudgets(uid),
      getAccounts(uid),
    ]);
    if (!exp.ok) setError(exp.error || "Could not load expenses.");
    else if (!bud.ok) setError(bud.error || "Could not load budgets.");
    else if (!acc.ok) setError(acc.error || "Could not load accounts.");
    setExpenses(exp.data || []);
    setBudgets(bud.data || {});
    setAccounts(acc.data?.length ? acc.data : DEFAULT_ACCOUNTS);
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

  const dailyAllowance = useMemo(
    () => (totalBudget > 0 ? totalBudget / monthDayCount : 0),
    [totalBudget, monthDayCount]
  );

  // Payload for the manual share button. `isAvailable` on the finance
  // templates requires totalBudget > 0, so the button hides itself until the
  // user has actually set some budgets.
  //
  // For a single category instead, the payload is:
  //   { kind: "category-under", categoryLabel, categoryIcon, categoryColor,
  //     spent, cap, monthLabel }
  const monthSharePayload = {
    kind: "month-under",
    monthLabel: monthName,
    totalSpent,
    totalBudget,
  };

  // Categories sorted by this-month spend, descending. Ties keep their
  // original order. Used to rank both the donut legend and (filtered to
  // non-zero) the donut chart slices, so the most prevalent category sits
  // at the top of the legend list.
  const rankedCategories = useMemo(
    () =>
      [...DEFAULT_CATEGORIES].sort(
        (a, b) => (spentByCategory[b.id] || 0) - (spentByCategory[a.id] || 0)
      ),
    [spentByCategory]
  );

  const donutData = useMemo(
    () =>
      rankedCategories
        .filter((c) => spentByCategory[c.id] > 0)
        .map((c) => ({
          id: c.id,
          label: c.label,
          value: spentByCategory[c.id],
          color: c.color,
        })),
    [rankedCategories, spentByCategory]
  );

  // Track most-recently-used account so the form can preselect it.
  const lastUsedAccount = useMemo(() => {
    const e = expenses.find((x) => x.account);
    return e?.account || accounts[0]?.id || "";
  }, [expenses, accounts]);

  // ---- handlers ----------------------------------------------------------
  const handleAddExpense = async (payload) => {
    const res = await addExpense(uid, payload);
    if (!res.ok) {
      setError(res.error || "Couldn't save the expense.");
      return false;
    }
    logAction(uid, 'finance', 'expense');
    onActivityLogged?.();
    await refresh();
    return true;
  };

  const handleDelete = async (id) => {
    const res = await deleteExpense(uid, id);
    if (!res.ok) setError(res.error || "Couldn't delete that.");
    await refresh();
  };

  const handleSaveBudgets = async (next) => {
    const writes = Object.entries(next).map(([cat, lim]) =>
      setBudget(uid, cat, lim)
    );
    const results = await Promise.all(writes);
    const fail = results.find((r) => !r.ok);
    if (fail) setError(fail.error || "Couldn't save budgets.");
    await refresh();
  };

  const handleSaveAccounts = async (nextAccounts, deletedIds) => {
    for (const id of deletedIds) {
      const res = await deleteAccount(uid, id);
      if (!res.ok) setError(res.error || "Couldn't delete account.");
    }
    for (const a of nextAccounts) {
      const res = await saveAccount(uid, a);
      if (!res.ok) setError(res.error || "Couldn't save account.");
    }
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
          {financeTab === "spending" && (
            <button
              type="button"
              className="cog-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              title="Settings"
            >
              ⚙️
            </button>
          )}
        </div>
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
            <ShareButton domain="finance" payload={monthSharePayload} />
            <button
                type="button"
                className="cog-btn"
                onClick={() => setShowSettings(true)}
                aria-label="Settings"
                title="Settings"
            >
              ⚙️
            </button>
          </div>

          {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
          )}
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="finance-view-tabs" role="tablist" aria-label="Finance view">
          <button type="button" role="tab" aria-selected={financeTab === "spending"} className={financeTab === "spending" ? "active" : ""} onClick={() => setFinanceTab("spending")}>Spending</button>
          <button type="button" role="tab" aria-selected={financeTab === "saving"} className={financeTab === "saving" ? "active" : ""} onClick={() => setFinanceTab("saving")}>Saving</button>
        </div>

        {financeTab === "spending" ? <>

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
              {rankedCategories.map((c) => (
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

          {/* ---------- Daily P&L calendar ---------- */}
          <div className="finance-card">
            <SpendingCalendar
                expenses={expenses}
                monthStart={monthStart}
                dailyAllowance={dailyAllowance}
            />
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
                        {/* Share this category, but only once it's actually
                        under a cap that exists. */}
                        {cap > 0 && ratio < 1 && (
                            <ShareButton
                                domain="finance"
                                payload={{
                                  kind: "category-under",
                                  categoryLabel: c.label,
                                  categoryIcon: c.icon,
                                  categoryColor: c.color,
                                  spent,
                                  cap,
                                  monthLabel: monthName,
                                }}
                            />
                        )}
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
            <AddExpenseForm
                accounts={accounts}
                defaultAccount={lastUsedAccount}
                onSubmit={handleAddExpense}
            />
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
                    const acc = accountById(accounts, e.account);
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
                            <div className="tx-cat">
                        <span
                            className="tx-account-icon"
                            title={acc.name}
                            style={{ background: acc.color + "22" }}
                        >
                          {acc.icon}
                        </span>
                              {cat.label}
                            </div>
                            <div className="tx-meta">
                              {acc.name} ·{" "}
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
                        {cat.label}
                      </div>
                      <div className="tx-meta">
                        {acc.name} ·{" "}
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
        </> : null}
        <div className="saving-view-stack" hidden={financeTab !== "saving"}>
          <SavingView uid={uid} totalBudget={totalBudget} onError={setError} />
        </div>
      </div>

        {showSettings && (
            <SettingsModal
                budgets={budgets}
                accounts={accounts}
                onSaveBudgets={handleSaveBudgets}
                onSaveAccounts={handleSaveAccounts}
                onClose={() => setShowSettings(false)}
            />
        )}
      </div>
  );
}

// ============================================================================
// Add expense sub-component
// ============================================================================

function AddExpenseForm({ accounts, defaultAccount, onSubmit }) {
  const todayIso = useMemo(() => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }, []);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [account, setAccount] = useState(defaultAccount || "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso);
  const [submitting, setSubmitting] = useState(false);

  // If parent learns a better default after first render, sync it.
  useEffect(() => {
    if (defaultAccount && !account) setAccount(defaultAccount);
  }, [defaultAccount, account]);

  const canSubmit = Number(amount) > 0 && !!account && !submitting;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({
      amount: Number(amount),
      category,
      account,
      note,
      date,
    });
    setSubmitting(false);
    if (ok) {
      setAmount("");
      setNote("");
      setCategory("food");
      // keep account selection for the next entry — most people use the
      // same account multiple times in a row
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

        <div className="account-chips" role="radiogroup" aria-label="Account">
          {accounts.map((a) => (
              <button
                  type="button"
                  key={a.id}
                  className={`account-chip ${account === a.id ? "selected" : ""}`}
                  onClick={() => setAccount(a.id)}
                  role="radio"
                  aria-checked={account === a.id}
              >
                <span className="account-swatch" style={{ background: a.color }} />
                <span aria-hidden="true">{a.icon}</span>
                {a.name}
              </button>
          ))}
        </div>

        <div className="field-row">
          <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
// Settings modal: Budgets tab + Accounts tab
// ============================================================================

function SettingsModal({
                         budgets,
                         accounts,
                         onSaveBudgets,
                         onSaveAccounts,
                         onClose,
                       }) {
  const [tab, setTab] = useState("budgets");

  // ----- Budgets tab state -----
  const [budgetDraft, setBudgetDraft] = useState(() => {
    const out = {};
    for (const c of DEFAULT_CATEGORIES) {
      out[c.id] = String(budgets?.[c.id]?.monthlyLimit || "");
    }
    return out;
  });

  // ----- Accounts tab state -----
  // Working copy of accounts so edits don't hit Firestore until "Save".
  const [acctDraft, setAcctDraft] = useState(
      () => accounts.map((a) => ({ ...a })) || []
  );
  const [deletedIds, setDeletedIds] = useState([]);

  const [saving, setSaving] = useState(false);

  // ---- handlers ----
  const saveBudgets = async () => {
    setSaving(true);
    const next = {};
    for (const k of Object.keys(budgetDraft)) {
      next[k] = Number(budgetDraft[k]) || 0;
    }
    await onSaveBudgets(next);
    setSaving(false);
    onClose();
  };

  const saveAccounts = async () => {
    setSaving(true);
    await onSaveAccounts(acctDraft, deletedIds);
    setSaving(false);
    onClose();
  };

  const updateAcct = (idx, patch) => {
    setAcctDraft((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    );
  };

  const deleteAcct = (idx) => {
    const a = acctDraft[idx];
    setDeletedIds((d) => (a.id ? [...d, a.id] : d));
    setAcctDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAcct = () => {
    const newId = `acc-${Date.now().toString(36)}`;
    setAcctDraft((prev) => [
      ...prev,
      { id: newId, name: "New account", icon: "💳", color: "#4d96ff" },
    ]);
  };

  return (
      <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
      >
        <div
            className="modal-card"
            role="dialog"
            aria-label="Settings"
            style={{ maxWidth: 460 }}
        >
          <h3>Settings</h3>

          <div className="tabs" role="tablist">
            <button
                type="button"
                role="tab"
                aria-selected={tab === "budgets"}
                className={`tab ${tab === "budgets" ? "active" : ""}`}
                onClick={() => setTab("budgets")}
            >
              Budgets
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={tab === "accounts"}
                className={`tab ${tab === "accounts" ? "active" : ""}`}
                onClick={() => setTab("accounts")}
            >
              Accounts
            </button>
          </div>

          {tab === "budgets" ? (
              <>
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
                          value={budgetDraft[c.id]}
                          onChange={(e) =>
                              setBudgetDraft((d) => ({ ...d, [c.id]: e.target.value }))
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
                      onClick={saveBudgets}
                      disabled={saving}
                      style={{ flex: 1 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
          ) : (
              <>
                <p
                    style={{
                      margin: 0,
                      color: "var(--pulse-text-muted)",
                      fontSize: 13,
                    }}
                >
                  Manage the bank accounts and payment methods you spend from.
                </p>

                {acctDraft.map((a, i) => (
                    <div key={a.id} className="account-edit-row">
                      <input
                          className="acc-icon"
                          type="text"
                          value={a.icon}
                          onChange={(e) =>
                              updateAcct(i, { icon: e.target.value.slice(0, 2) })
                          }
                          aria-label="Icon"
                      />
                      <input
                          className="acc-name"
                          type="text"
                          value={a.name}
                          onChange={(e) => updateAcct(i, { name: e.target.value })}
                          aria-label="Account name"
                      />
                      <input
                          className="acc-color"
                          type="color"
                          value={a.color}
                          onChange={(e) => updateAcct(i, { color: e.target.value })}
                          aria-label="Color"
                      />
                      <button
                          type="button"
                          className="delete-acc"
                          onClick={() => deleteAcct(i)}
                          aria-label="Delete account"
                          title="Delete"
                      >
                        ×
                      </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="add-account-btn"
                    onClick={addAcct}
                >
                  + Add account
                </button>

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
                      onClick={saveAccounts}
                      disabled={saving}
                      style={{ flex: 1 }}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
          )}
        </div>
      </div>
  );
}

export default Finance;
