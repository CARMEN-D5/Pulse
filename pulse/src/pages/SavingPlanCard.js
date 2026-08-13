import React, { useEffect, useRef, useState } from "react";

const money = (value, decimals = 0) => `$${Number(value || 0).toFixed(decimals)}`;
const formatDate = (value) => value.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default function SavingPlanCard({ plan, savedAmount, onEdit }) {
  const holdTimer = useRef(null);
  const [pressed, setPressed] = useState(false);
  const target = Number(plan.targetAmount || 0);
  const remaining = Math.max(0, target - savedAmount);
  const due = new Date(`${plan.dueDate}T23:59:59`);
  const now = new Date();
  const rawDays = Math.ceil((due - now) / 86400000);
  const expiredDays = rawDays < 0 ? Math.max(1, Math.floor((now - due) / 86400000)) : 0;
  const percentage = target ? Math.min(100, (savedAmount / target) * 100) : 0;
  const created = plan.createdAt?.toDate?.() || (plan.createdAt ? new Date(plan.createdAt) : null);
  const cancelHold = () => {
    clearTimeout(holdTimer.current);
    setPressed(false);
  };

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  return <article
    className={`saving-plan-item ${pressed ? "pressed" : ""}`}
    style={{ "--plan-color": plan.color }}
    aria-label={`${plan.name} saving plan. Double-click or long-press to edit.`}
    onDoubleClick={() => onEdit(plan)}
    onPointerDown={(event) => {
      if (event.button !== 0 || event.target.closest("button, input, select, textarea, a")) return;
      setPressed(true);
      holdTimer.current = setTimeout(() => {
        setPressed(false);
        onEdit(plan);
      }, 550);
    }}
    onPointerUp={cancelHold}
    onPointerCancel={cancelHold}
    onPointerLeave={cancelHold}
  >
    <div className="saving-plan-item-title">
      <div className="saving-plan-identity"><span className="saving-plan-title-icon">{plan.icon}</span><h3>{plan.name}</h3><strong className="saving-plan-goal">{money(target)}</strong></div>
      <div className="saving-plan-title-end"><strong className="saving-plan-percentage">{percentage.toFixed(0)}%</strong></div>
    </div>
    <div className="saving-progress" aria-label={`${percentage.toFixed(0)}% saved`}><span style={{ width: `${percentage}%` }} /></div>
    <div className="saving-plan-balance"><span>Saved {money(savedAmount)}</span><span>{money(remaining)} left</span></div>
    <div className="saving-plan-item-footer">
      <span>{created ? formatDate(created) : "Start date unavailable"} – {formatDate(due)}</span>
      <span className={expiredDays ? "saving-expired" : ""}>
        {expiredDays ? `Expired ${expiredDays} day${expiredDays === 1 ? "" : "s"} ago` : <span className="saving-plan-timing"><small>{rawDays > 0 ? `${money(remaining / rawDays, 2)}/day needed` : ""}</small><strong>{Math.max(0, rawDays)} days left</strong></span>}
      </span>
    </div>
  </article>;
}
