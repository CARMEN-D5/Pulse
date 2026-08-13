import React, { useState } from "react";

export default function SavingEntryModal({ dayKey, plans, entries, onClose, onSave, onCreatePlan }) {
  const [rows, setRows] = useState(() => entries.length ? entries.map((entry) => ({ planId: entry.planId, amount: entry.amount, source: entry.source })) : [{ planId: plans[0]?.id || "", amount: "", source: "manual" }]);
  const [saving, setSaving] = useState(false);
  const patch = (index, value) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...value } : row));
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const valid = rows.length === 0 || rows.every((row) => row.planId && Number(row.amount) > 0);
  const date = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-card saving-modal" role="dialog" aria-modal="true" aria-labelledby="saving-entry-title">
    <div className="saving-entry-date">{date}</div><h3 id="saving-entry-title">Add saving record</h3>
    {plans.length === 0 ? <div className="saving-no-active"><p>No active saving plan</p><button type="button" className="btn btn-primary" onClick={onCreatePlan}>Create a saving plan</button></div> : <>
      <div className="saving-entry-prompt">Add <strong>${total.toFixed(2)}</strong> to a saving plan</div>
      {rows.map((row, index) => <div className="saving-entry-row" key={index}><input aria-label="Amount" type="number" min="0.01" step="0.01" value={row.amount} placeholder="$0.00" onChange={(event) => patch(index, { amount: event.target.value })} /><select aria-label="Saving plan" value={row.planId} onChange={(event) => patch(index, { planId: event.target.value })}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.icon} {plan.name}</option>)}</select><button type="button" aria-label="Delete row" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>×</button></div>)}
      {rows.length < 4 && <button type="button" className="saving-add-row" onClick={() => setRows((current) => [...current, { planId: plans[0]?.id || "", amount: "", source: "manual" }])}>+ Add another saving</button>}
    </>}
    <div className="saving-modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button>{plans.length > 0 && <button type="button" className="btn btn-primary" disabled={!valid || saving} onClick={async () => { setSaving(true); await onSave(rows); setSaving(false); }}>{saving ? "Saving…" : "Save"}</button>}</div>
  </div></div>;
}
