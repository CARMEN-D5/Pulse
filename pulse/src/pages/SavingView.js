import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { daysInMonth, listExpenses, monthBounds } from "../firestore/finance";
import {
  addSavingEntry,
  completeSavingPlan,
  deleteSavingPlan,
  getDailySavingPrompt,
  getSavingTotalsByPlan,
  listSavingEntries,
  listSavingPlans,
  localDayKey,
  markDailySavingPromptChecked,
  replaceSavingEntriesForDay,
  restoreSavingPlan,
  saveSavingPlan,
} from "../firestore/savings";
import SavingPlanCard from "./SavingPlanCard";
import SavingCalendar from "./SavingCalendar";
import SavingPlanModal from "./SavingPlanModal";
import SavingEntryModal from "./SavingEntryModal";
import SavingDetailsModal from "./SavingDetailsModal";
import SavingModalShell from "./SavingModalShell";
import CompletedPlansHistory from "./CompletedPlansHistory";
import SavingMilestoneModal from "./SavingMilestoneModal";
import {
  bestShareEvent,
  getSavingProgressEvent,
  savingsSharePayload,
} from "./savingMilestones";
import SegmentedField from "../components/SegmentedField";
import { PrimaryButton } from "../components/ui";
import { useSharePrompt } from "../components/share";
import { confirm } from "../utils/dialogs";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import { TUTORIAL_TARGETS, TutorialTarget, useTutorial } from "../tutorial";

export default function SavingView({ uid, totalBudget, onError }) {
  const [plans, setPlans] = useState([]);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [savedByPlan, setSavedByPlan] = useState({});
  const [planModal, setPlanModal] = useState(null);
  const [entryDay, setEntryDay] = useState(null);
  const [detailsDay, setDetailsDay] = useState(null);
  const [surplus, setSurplus] = useState(null);
  const [progressQueue, setProgressQueue] = useState([]);
  // The one event worth offering to share once the queue has drained.
  const [pendingShare, setPendingShare] = useState(null);
  const currentMonth = useMemo(() => monthBounds().monthStart, []);
  const [viewMonth, setViewMonth] = useState(currentMonth);

  const { openSharePrompt } = useSharePrompt();

  const savingOverviewTutorial = useTutorial("savingOverview", {
    enabled: Boolean(uid),
    actions: {
      openPlan: () => setPlanModal({}),
      cleanup: () => setPlanModal(null),
    },
  });

  const loadPlanData = useCallback(async () => {
    const planResponse = await listSavingPlans(uid);
    if (!planResponse.ok) return onError(planResponse.error);
    setPlans(planResponse.data);
    const totalResponse = await getSavingTotalsByPlan(
        uid,
        planResponse.data.map((plan) => plan.id)
    );
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

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  useEffect(() => {
    loadCalendarMonth();
  }, [loadCalendarMonth]);

  const active = useMemo(() => plans.filter((p) => p.status === "active"), [plans]);
  const progressEventsForDaySave = (dayKey, rows) => {
    const oldDayAmounts = calendarEntries
        .filter((entry) => entry.dayKey === dayKey)
        .reduce((out, entry) => {
          out[entry.planId] = (out[entry.planId] || 0) + Number(entry.amount || 0);
          return out;
        }, {});
    const newDayAmounts = rows.reduce((out, row) => {
      out[row.planId] = (out[row.planId] || 0) + Number(row.amount || 0);
      return out;
    }, {});
    const orderedPlanIds = [...new Set(rows.map((row) => row.planId))];
    return orderedPlanIds
        .map((planId) => {
          const plan = active.find((item) => item.id === planId);
          const oldSavedAmount = Number(savedByPlan[planId] || 0);
          const newSavedAmount =
              oldSavedAmount - Number(oldDayAmounts[planId] || 0) + Number(newDayAmounts[planId] || 0);
          return getSavingProgressEvent(plan, oldSavedAmount, newSavedAmount);
        })
        .filter(Boolean);
  };

  const enqueueProgressEvents = (events) => {
    if (events.length) setProgressQueue((current) => [...current, ...events]);
  };

  /**
   * Dismissing a milestone modal both advances the queue and remembers the
   * event as a share candidate.
   *
   * The share prompt is deliberately NOT opened here. SavingMilestoneModal and
   * SharingPromptPopUp are both <Modal>s, and stacking two of them is unreliable
   * on iOS — the second can present behind the first, or not at all. So the
   * candidate is held and the prompt is raised by the effect below, once the
   * queue has drained and no milestone modal is mounted.
   */
  const dismissTopEvent = (event) => {
    setPendingShare((current) => bestShareEvent(current, event));
    setProgressQueue((current) => current.slice(1));
  };

  useEffect(() => {
    if (progressQueue.length || !pendingShare) return;
    const plan = plans.find((item) => item.id === pendingShare.planId);
    const payload = savingsSharePayload(pendingShare, plan);
    // Clear first: openSharePrompt sets state in the provider, and leaving the
    // candidate in place would re-run this effect on the next render.
    setPendingShare(null);
    openSharePrompt("finance", payload, { source: "auto" });
  }, [progressQueue.length, pendingShare, plans, openSharePrompt]);

  useEffect(() => {
    if (
      !uid ||
      !active.length ||
      !savingOverviewTutorial.handled
    ) return;
    let cancelled = false;
    (async () => {
      const todayKey = localDayKey();
      const prompt = await getDailySavingPrompt(uid);
      if (!prompt.ok || prompt.data?.lastCheckedDate === todayKey) return;
      await markDailySavingPromptChecked(uid, todayKey);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = localDayKey(yesterday);
      const yStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const yEnd = new Date(yStart);
      yEnd.setDate(yEnd.getDate() + 1);
      const [saved, spent] = await Promise.all([
        listSavingEntries(uid, { start: yStart, end: yEnd }),
        listExpenses(uid, { monthStart: yStart, monthEnd: yEnd }),
      ]);
      if (!saved.ok || !spent.ok || saved.data.length) return;
      const dailyBudget = totalBudget / daysInMonth(yesterday);
      const yesterdaySpent = spent.data.reduce((s, e) => s + Number(e.amount || 0), 0);
      const amount = dailyBudget - yesterdaySpent;
      if (!cancelled && amount > 0) {
        setSurplus({ dayKey: yKey, dailyBudget, spent: yesterdaySpent, amount, planId: active[0].id });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, active, totalBudget, savingOverviewTutorial.handled]);

  const handleDeletePlan = async (plan) => {
    const confirmed = await confirm(
        `Delete “${plan.name}” and all of its saving records? This cannot be undone.`,
        { title: "Delete saving plan", confirmLabel: "Delete", destructive: true }
    );
    if (!confirmed) return;
    const response = await deleteSavingPlan(uid, plan.id);
    if (!response.ok) return onError(response.error);
    refresh();
  };

  const surplusPlanOptions = active.map((plan) => ({
    value: plan.id,
    label: `${plan.icon} ${plan.name}`,
  }));

  return (
    <>
      <TutorialTarget id={TUTORIAL_TARGETS.saving.planArea}>
      <View style={[styles.card, shadow("sm")]}>
        {active.length ? (
          <View style={styles.planList}>
            {active.map((plan) => (
              <SavingPlanCard
                key={plan.id}
                plan={plan}
                savedAmount={savedByPlan[plan.id] || 0}
                onEdit={setPlanModal}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Create a saving plan</Text>
            <Text style={styles.emptyBody}>
              Set a goal, due date and colour to start tracking savings.
            </Text>
            <PrimaryButton label="Create a saving plan" onPress={() => setPlanModal({})} />
          </View>
        )}
      </View>
      </TutorialTarget>

      <TutorialTarget id={TUTORIAL_TARGETS.saving.calendar}>
      <View style={[styles.card, shadow("sm")]}>
        <SavingCalendar
          monthStart={viewMonth}
          entries={calendarEntries}
          plans={plans}
          hasActivePlans={active.length > 0}
          canViewNextMonth={viewMonth.getTime() < currentMonth.getTime()}
          onPreviousMonth={() =>
            setViewMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
          onNextMonth={() =>
            setViewMonth((month) =>
              month.getTime() < currentMonth.getTime()
                ? new Date(month.getFullYear(), month.getMonth() + 1, 1)
                : month
            )
          }
          onViewDay={setDetailsDay}
          onEditDay={setEntryDay}
          onAddPlan={() => setPlanModal({})}
        />
      </View>
      </TutorialTarget>

        <CompletedPlansHistory
            plans={plans}
            savedByPlan={savedByPlan}
            onEdit={setPlanModal}
            onRestore={async (plan) => {
              const response = await restoreSavingPlan(uid, plan.id);
              if (!response.ok) return onError(response.error);
              refresh();
            }}
            onDelete={handleDeletePlan}
        />

        {planModal && (
            <SavingPlanModal
                plan={planModal.id ? planModal : null}
                onClose={() => setPlanModal(null)}
                onSave={async (p) => {
                  const r = await saveSavingPlan(uid, p);
                  if (!r.ok) return onError(r.error);
                  setPlanModal(null);
                  refresh();
                }}
            />
        )}

        {detailsDay && (
            <SavingDetailsModal
                dayKey={detailsDay}
                plans={plans}
                entries={calendarEntries.filter((entry) => entry.dayKey === detailsDay)}
                onClose={() => setDetailsDay(null)}
            />
        )}

        {entryDay && (
            <SavingEntryModal
                dayKey={entryDay}
                plans={active}
                entries={calendarEntries.filter((e) => e.dayKey === entryDay)}
                onClose={() => setEntryDay(null)}
                onCreatePlan={() => {
                  setEntryDay(null);
                  setPlanModal({});
                }}
                onSave={async (rows) => {
                  const events = progressEventsForDaySave(entryDay, rows);
                  const r = await replaceSavingEntriesForDay(uid, entryDay, rows);
                  if (!r.ok) return onError(r.error);
                  enqueueProgressEvents(events);
                  setEntryDay(null);
                  refresh();
                }}
            />
        )}

        {surplus && (
            <SavingModalShell
                title="Save yesterday's unused budget?"
                onClose={() => setSurplus(null)}
                footer={
                  <>
                    <PrimaryButton
                        label="Cancel"
                        variant="danger"
                        onPress={() => setSurplus(null)}
                        style={styles.flex}
                    />
                    <PrimaryButton
                        label="Add to plan"
                        style={styles.flex}
                        onPress={async () => {
                          const plan = active.find((item) => item.id === surplus.planId);
                          const oldSavedAmount = Number(savedByPlan[surplus.planId] || 0);
                          const event = getSavingProgressEvent(
                              plan,
                              oldSavedAmount,
                              oldSavedAmount + Number(surplus.amount || 0)
                          );
                          const r = await addSavingEntry(uid, { ...surplus, source: "unused-daily-budget" });
                          if (!r.ok) return onError(r.error);
                          enqueueProgressEvents(event ? [event] : []);
                          setSurplus(null);
                          refresh();
                        }}
                    />
                  </>
                }
            >
              <View style={styles.breakdown}>
                <BreakdownRow label="Yesterday's budget" value={surplus.dailyBudget} />
                <BreakdownRow label="Yesterday's spending" value={surplus.spent} />
                <BreakdownRow label="Available to save" value={surplus.amount} strong />
              </View>

              <Text style={styles.fieldLabel}>Saving plan</Text>
              <SegmentedField
                  options={surplusPlanOptions}
                  value={surplus.planId}
                  onChange={(value) => setSurplus((s) => ({ ...s, planId: value }))}
                  scrollable
              />
            </SavingModalShell>
        )}

        {progressQueue.length > 0 && (
            <SavingMilestoneModal
                key={`${progressQueue[0].type}-${progressQueue[0].planId}-${
                    progressQueue[0].milestone || 100
                }`}
                event={progressQueue[0]}
                onClose={() => dismissTopEvent(progressQueue[0])}
                onComplete={async (event) => {
                  const response = await completeSavingPlan(uid, event.planId);
                  if (!response.ok) {
                    onError("Could not complete this saving plan.");
                    return false;
                  }
                  await loadPlanData();
                  dismissTopEvent(event);
                  return true;
                }}
            />
        )}
      </>
  );
}

function BreakdownRow({ label, value, strong = false }) {
  return (
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <Text style={[styles.breakdownValue, strong && styles.breakdownStrong]}>
          ${Number(value || 0).toFixed(2)}
        </Text>
      </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  planList: { gap: spacing.md },

  emptyState: { gap: spacing.sm, alignItems: "stretch" },
  emptyTitle: { ...type.title, fontFamily: fonts.bold, color: colors.text },
  emptyBody: { ...type.small, color: colors.textMuted },

  breakdown: { gap: spacing.sm },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between" },
  breakdownLabel: { ...type.body, color: colors.textMuted },
  breakdownValue: { ...type.body, fontFamily: fonts.semibold, color: colors.text },
  breakdownStrong: { fontFamily: fonts.bold },

  fieldLabel: { ...type.label, color: colors.text },
});