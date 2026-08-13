import React, { useCallback, useEffect, useMemo, useState } from "react";
import { daysInMonth, listExpenses, monthBounds } from "../firestore/finance";
import { addSavingEntry, completeSavingPlan, deleteSavingPlan, getDailySavingPrompt, getSavingTotalsByPlan, listSavingEntries, listSavingPlans, localDayKey, markDailySavingPromptChecked, replaceSavingEntriesForDay, restoreSavingPlan, saveSavingPlan } from "../firestore/savings";
import SavingPlanCard from "./SavingPlanCard";
import SavingCalendar from "./SavingCalendar";
import SavingPlanModal from "./SavingPlanModal";
import SavingEntryModal from "./SavingEntryModal";
import SavingDetailsModal from "./SavingDetailsModal";
import CompletedPlansHistory from "./CompletedPlansHistory";
import SavingMilestoneModal from "./SavingMilestoneModal";
import { getSavingProgressEvent } from "./savingMilestones";

export default function SavingView({ uid, totalBudget, onError }) {
  const [plans, setPlans] = useState([]), [calendarEntries, setCalendarEntries] = useState([]), [savedByPlan, setSavedByPlan] = useState({});
  const [planModal, setPlanModal] = useState(null), [entryDay, setEntryDay] = useState(null), [detailsDay, setDetailsDay] = useState(null), [surplus, setSurplus] = useState(null);
  const [progressQueue, setProgressQueue] = useState([]);
  const currentMonth = useMemo(() => monthBounds().monthStart, []);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const loadPlanData = useCallback(async () => {
    const planResponse = await listSavingPlans(uid);
    if (!planResponse.ok) return onError(planResponse.error);
    setPlans(planResponse.data);
    const totalResponse = await getSavingTotalsByPlan(uid, planResponse.data.map((plan) => plan.id));
    if (!totalResponse.ok) return onError(totalResponse.error);
    setSavedByPlan(totalResponse.data);
  }, [uid, onError]);
  const loadCalendarMonth = useCallback(async () => {
    const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    const response = await listSavingEntries(uid, { start: monthStart, end: monthEnd });
    if (!response.ok) return onError(response.error);
    setCalendarEntries(response.data);
  }, [uid, viewMonth, onError]);
  const refresh = useCallback(async () => {
    await Promise.all([loadPlanData(), loadCalendarMonth()]);
  }, [loadPlanData, loadCalendarMonth]);
  useEffect(() => { loadPlanData(); }, [loadPlanData]);
  useEffect(() => { loadCalendarMonth(); }, [loadCalendarMonth]);
  const active = useMemo(() => plans.filter((p) => p.status === "active"), [plans]);

  const progressEventsForDaySave = (dayKey, rows) => {
    const oldDayAmounts = calendarEntries.filter((entry) => entry.dayKey === dayKey).reduce((out, entry) => {
      out[entry.planId] = (out[entry.planId] || 0) + Number(entry.amount || 0);
      return out;
    }, {});
    const newDayAmounts = rows.reduce((out, row) => {
      out[row.planId] = (out[row.planId] || 0) + Number(row.amount || 0);
      return out;
    }, {});
    const orderedPlanIds = [...new Set(rows.map((row) => row.planId))];
    return orderedPlanIds.map((planId) => {
      const plan = active.find((item) => item.id === planId);
      const oldSavedAmount = Number(savedByPlan[planId] || 0);
      const newSavedAmount = oldSavedAmount - Number(oldDayAmounts[planId] || 0) + Number(newDayAmounts[planId] || 0);
      return getSavingProgressEvent(plan, oldSavedAmount, newSavedAmount);
    }).filter(Boolean);
  };

  const enqueueProgressEvents = (events) => {
    if (events.length) setProgressQueue((current) => [...current, ...events]);
  };

  useEffect(() => {
    if (!uid || !active.length) return;
    let cancelled = false;
    (async () => {
      const todayKey = localDayKey(), prompt = await getDailySavingPrompt(uid);
      if (!prompt.ok || prompt.data?.lastCheckedDate === todayKey) return;
      await markDailySavingPromptChecked(uid, todayKey);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yKey = localDayKey(yesterday), yStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()), yEnd = new Date(yStart); yEnd.setDate(yEnd.getDate() + 1);
      const [saved, spent] = await Promise.all([listSavingEntries(uid, { start: yStart, end: yEnd }), listExpenses(uid, { monthStart: yStart, monthEnd: yEnd })]);
      if (!saved.ok || !spent.ok || saved.data.length) return;
      const dailyBudget = totalBudget / daysInMonth(yesterday), yesterdaySpent = spent.data.reduce((s, e) => s + Number(e.amount || 0), 0), amount = dailyBudget - yesterdaySpent;
      if (!cancelled && amount > 0) setSurplus({ dayKey: yKey, dailyBudget, spent: yesterdaySpent, amount, planId: active[0].id });
    })(); return () => { cancelled = true; };
  }, [uid, active, totalBudget]);

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete “${plan.name}” and all of its saving records? This cannot be undone.`)) return;
    const response = await deleteSavingPlan(uid, plan.id);
    if (!response.ok) return onError(response.error);
    refresh();
  };

  return <><div className="finance-card saving-active-card">
    {active.length ? <div className="saving-plan-list">{active.map((plan) => <SavingPlanCard key={plan.id} plan={plan} savedAmount={savedByPlan[plan.id] || 0} onEdit={setPlanModal} />)}</div> : <div className="saving-empty"><h2>Create a saving plan</h2><p>Set a goal, due date and colour to start tracking savings.</p><button className="btn btn-primary" onClick={() => setPlanModal({})}>Create a saving plan</button></div>}
    </div>
    <div className="finance-card"><SavingCalendar monthStart={viewMonth} entries={calendarEntries} plans={plans} hasActivePlans={active.length > 0} canViewNextMonth={viewMonth.getTime() < currentMonth.getTime()} onPreviousMonth={() => setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} onNextMonth={() => setViewMonth((month) => month.getTime() < currentMonth.getTime() ? new Date(month.getFullYear(), month.getMonth() + 1, 1) : month)} onViewDay={setDetailsDay} onEditDay={setEntryDay} onAddPlan={() => setPlanModal({})}/></div>
    <CompletedPlansHistory plans={plans} savedByPlan={savedByPlan} onEdit={setPlanModal} onRestore={async (plan) => { const response = await restoreSavingPlan(uid, plan.id); if (!response.ok) return onError(response.error); refresh(); }} onDelete={handleDeletePlan}/>
    {planModal && <SavingPlanModal plan={planModal.id ? planModal : null} onClose={() => setPlanModal(null)} onSave={async (p) => { const r = await saveSavingPlan(uid, p); if (!r.ok) return onError(r.error); setPlanModal(null); refresh(); }}/>} 
    {detailsDay && <SavingDetailsModal dayKey={detailsDay} plans={plans} entries={calendarEntries.filter((entry) => entry.dayKey === detailsDay)} onClose={() => setDetailsDay(null)} />}
    {entryDay && <SavingEntryModal dayKey={entryDay} plans={active} entries={calendarEntries.filter((e) => e.dayKey === entryDay)} onClose={() => setEntryDay(null)} onCreatePlan={() => { setEntryDay(null); setPlanModal({}); }} onSave={async (rows) => { const events = progressEventsForDaySave(entryDay, rows); const r = await replaceSavingEntriesForDay(uid, entryDay, rows); if (!r.ok) return onError(r.error); enqueueProgressEvents(events); setEntryDay(null); refresh(); }}/>} 
    {surplus && <div className="modal-backdrop"><div className="modal-card saving-modal"><h3>Save yesterday's unused budget?</h3><div className="surplus-breakdown"><span>Yesterday's budget<strong>${surplus.dailyBudget.toFixed(2)}</strong></span><span>Yesterday's spending<strong>${surplus.spent.toFixed(2)}</strong></span><span>Available to save<strong>${surplus.amount.toFixed(2)}</strong></span></div><label>Saving plan<select value={surplus.planId} onChange={(e) => setSurplus((s) => ({ ...s, planId: e.target.value }))}>{active.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}</select></label><div className="saving-modal-actions"><button className="btn" onClick={() => setSurplus(null)}>Cancel</button><button className="btn btn-primary" onClick={async () => { const plan = active.find((item) => item.id === surplus.planId); const oldSavedAmount = Number(savedByPlan[surplus.planId] || 0); const event = getSavingProgressEvent(plan, oldSavedAmount, oldSavedAmount + Number(surplus.amount || 0)); const r = await addSavingEntry(uid, { ...surplus, source: "unused-daily-budget" }); if (!r.ok) return onError(r.error); enqueueProgressEvents(event ? [event] : []); setSurplus(null); refresh(); }}>Add to plan</button></div></div></div>}
    {progressQueue.length > 0 && <SavingMilestoneModal key={`${progressQueue[0].type}-${progressQueue[0].planId}-${progressQueue[0].milestone || 100}`} event={progressQueue[0]} onClose={() => setProgressQueue((current) => current.slice(1))} onComplete={async (event) => { const response = await completeSavingPlan(uid, event.planId); if (!response.ok) { onError("Could not complete this saving plan."); return false; } await loadPlanData(); setProgressQueue((current) => current.slice(1)); return true; }} />}
  </>;
}
