import React, { useState } from "react";

const ICONS = ["✈️", "🏠", "🚗", "💻", "📱", "🎓", "💍", "🎁", "🏖️", "💰", "🐶", "🎮"];
const COLOURS = ["#4d96ff", "#ff6b6b", "#9b5de5", "#f6c453", "#80b918", "#00b4d8", "#f72585", "#fb8500"];

export default function SavingPlanModal({ plan, onClose, onSave }) {
  const [draft, setDraft] = useState(plan || { name: "", icon: "✈️", color: "#4d96ff", targetAmount: "", dueDate: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const valid = draft.name.trim() && Number(draft.targetAmount) > 0 && draft.dueDate;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal-card saving-modal" onSubmit={async (event) => { event.preventDefault(); if (!valid) return; setSaving(true); await onSave(draft); setSaving(false); }}>
    <h3>{plan ? "Edit saving plan" : "Create a saving plan"}</h3>
    <label>Plan name<input placeholder="Plan name" value={draft.name} onChange={(event) => change("name", event.target.value)} /></label>
    <fieldset className="saving-choice-field"><legend>Icon</legend><div className="saving-icon-options">{ICONS.map((icon) => <button key={icon} type="button" className={draft.icon === icon ? "selected" : ""} onClick={() => change("icon", icon)} aria-label={`Choose ${icon}`}>{icon}</button>)}</div><label className="saving-custom-icon">Custom icon<input aria-label="Custom icon" value={ICONS.includes(draft.icon) ? "" : draft.icon} onChange={(event) => change("icon", event.target.value)} maxLength={4} placeholder="✨" /></label></fieldset>
    <fieldset className="saving-choice-field"><legend>Plan colour</legend><div className="saving-colour-options">{COLOURS.map((colour) => <button key={colour} type="button" className={draft.color === colour ? "selected" : ""} style={{ background: colour }} onClick={() => change("color", colour)} aria-label={`Choose ${colour}`} />)}<label className={`saving-custom-colour ${!COLOURS.includes(draft.color) ? "selected" : ""}`} title="Custom colour"><input type="color" value={draft.color} onInput={(event) => change("color", event.target.value)} onChange={(event) => change("color", event.target.value)} /><span style={{ background: draft.color }}>+</span></label></div><small>Selected: {draft.color}</small></fieldset>
    <label>Goal amount<input type="number" min="0.01" step="0.01" value={draft.targetAmount} onChange={(event) => change("targetAmount", event.target.value)} /></label>
    <label>Due date<input type="date" value={draft.dueDate} onChange={(event) => change("dueDate", event.target.value)} /></label>
    {plan && <label>Status<select value={draft.status} onChange={(event) => change("status", event.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>}
    <div className="saving-modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid || saving}>{saving ? "Saving…" : "Save"}</button></div>
  </form></div>;
}
