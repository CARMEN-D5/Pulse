import React from "react";

export default function CompletedPlansHistory({ plans, savedByPlan, onEdit, onRestore, onDelete }) {
  const history = plans.filter((plan) => plan.status === "completed" || plan.status === "archived");
  return <div className="finance-card"><div className="section-title">History</div>{history.length ? <div className="completed-plan-list">{history.map((plan) => <div className="completed-plan" key={plan.id}>
    <span className="completed-plan-icon" style={{ background: `${plan.color}22` }}>{plan.icon}</span>
    <div className="completed-plan-main"><div className="history-plan-title"><strong>{plan.name}</strong><span className={`history-status ${plan.status}`}>{plan.status === "completed" ? "Completed" : "Archived"}</span></div>{plan.status === "completed" && <small>{plan.completedAt?.toDate?.().toLocaleDateString("en-AU") || "Completion date unavailable"}</small>}<span>${Number(savedByPlan[plan.id] || 0).toFixed(0)} saved / ${Number(plan.targetAmount || 0).toFixed(0)} goal</span></div>
    <div className="completed-plan-actions"><button type="button" onClick={() => onEdit(plan)}>Edit</button><button type="button" onClick={() => onRestore(plan)}>Restore</button><button type="button" className="danger" onClick={() => onDelete(plan)}>Delete</button></div>
  </div>)}</div> : <div className="empty-state">Completed and archived saving plans will appear here.</div>}</div>;
}
