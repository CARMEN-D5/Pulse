import React, { useMemo, useRef } from "react";
import { localDayKey } from "../firestore/savings";

export default function SavingCalendar({ monthStart, entries, plans, hasActivePlans, canViewNextMonth, onPreviousMonth, onNextMonth, onViewDay, onEditDay, onAddPlan }) {
  const holdTimer = useRef(null), clickTimer = useRef(null), held = useRef(false);
  const planMap = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.id, plan])), [plans]);
  const byDay = useMemo(() => entries.reduce((out, entry) => { (out[entry.dayKey] ||= []).push(entry); return out; }, {}), [entries]);
  const cells = useMemo(() => {
    const year = monthStart.getFullYear(), month = monthStart.getMonth(), result = [];
    for (let index = 0; index < new Date(year, month, 1).getDay(); index++) result.push({ blank: true, key: `blank-${index}` });
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const date = new Date(year, month, day), key = localDayKey(date);
      result.push({ date, key, entries: byDay[key] || [] });
    }
    return result;
  }, [monthStart, byDay]);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const earliest = new Date(); earliest.setDate(earliest.getDate() - 7); earliest.setHours(0, 0, 0, 0);
  const editable = (cell) => !cell.blank && cell.date <= todayEnd && cell.date >= earliest;
  const edit = (cell) => editable(cell) && onEditDay(cell.key);
  const cancelHold = () => { clearTimeout(holdTimer.current); };

  return <section className="saving-calendar">
    <div className="cal-head"><div><div className="cal-title">Saving calendar</div><div className="cal-sub">Click to view · Double-click or long-press a recent day to edit</div></div></div>
    <div className="saving-month-nav" aria-label="Saving calendar month navigation">
      <button type="button" onClick={onPreviousMonth} aria-label="Previous month">‹</button>
      <strong>{monthStart.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</strong>
      <button type="button" onClick={onNextMonth} disabled={!canViewNextMonth} aria-label="Next month">›</button>
    </div>
    <div className="cal-weekdays">{"SMTWTFS".split("").map((label, index) => <span key={index}>{label}</span>)}</div>
    <div className="cal-grid">{cells.map((cell) => {
      if (cell.blank) return <div className="cal-cell blank" key={cell.key} />;
      const future = cell.date > todayEnd;
      const background = cell.entries.length
        ? `conic-gradient(${cell.entries.map((entry, index) => `${planMap[entry.planId]?.color || "#aaa"} ${index * 100 / cell.entries.length}% ${(index + 1) * 100 / cell.entries.length}%`).join(",")})`
        : future ? "#fff" : "#edf0f3";
      return <button type="button" key={cell.key} className={`cal-cell saving-cal-cell ${future ? "future" : "past-empty"}`} style={{ background }}
        onClick={() => { if (held.current) { held.current = false; return; } clearTimeout(clickTimer.current); clickTimer.current = setTimeout(() => onViewDay(cell.key), 220); }}
        onDoubleClick={() => { clearTimeout(clickTimer.current); edit(cell); }}
        onPointerDown={() => { held.current = false; if (editable(cell)) holdTimer.current = setTimeout(() => { held.current = true; edit(cell); }, 550); }}
        onPointerUp={cancelHold} onPointerCancel={cancelHold} onPointerLeave={cancelHold}>
        <span className="cal-day">{cell.date.getDate()}</span>{cell.entries.length > 0 && <span className="cal-amt">${cell.entries.reduce((sum, entry) => sum + Number(entry.amount), 0).toFixed(0)}</span>}
      </button>;
    })}</div>
    <button className="btn btn-primary saving-calendar-add" type="button" onClick={onAddPlan}>{hasActivePlans ? "+ Add saving plan" : "Create a saving plan"}</button>
  </section>;
}
