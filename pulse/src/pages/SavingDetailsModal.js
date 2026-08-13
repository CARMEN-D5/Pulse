import React from "react";

export default function SavingDetailsModal({ dayKey, entries, plans, onClose }) {
  const planMap = Object.fromEntries(plans.map((plan) => [plan.id, plan]));
  const date = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal-card saving-modal" role="dialog" aria-modal="true" aria-labelledby="saving-details-title">
    <div className="saving-entry-date">{date}</div><h3 id="saving-details-title">Saving details</h3>
    {entries.length === 0 ? <div className="saving-modal-empty">No saving record</div> : <div className="saving-details-list">{entries.map((entry) => { const plan = planMap[entry.planId]; return <div className="saving-details-row" key={entry.id}><span className="legend-swatch" style={{ background: plan?.color || "#aaa" }} /><span>{plan?.icon} {plan?.name || "Unknown plan"}<small>{entry.source === "unused-daily-budget" ? "Unused daily budget" : "Manual"}</small></span><strong>${Number(entry.amount).toFixed(2)}</strong></div>; })}<div className="saving-details-total"><span>Total</span><strong>${entries.reduce((sum, entry) => sum + Number(entry.amount), 0).toFixed(2)}</strong></div></div>}
    <div className="saving-modal-actions"><button type="button" className="btn btn-primary" onClick={onClose}>Close</button></div>
  </div></div>;
}
