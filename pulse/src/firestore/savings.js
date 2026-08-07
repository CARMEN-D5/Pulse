import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy,
  query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

const plansCol = (uid) => collection(db, "users", uid, "savingPlans");
const entriesCol = (uid) => collection(db, "users", uid, "savingEntries");
const result = (error, data) => error ? { ok: false, error: error?.message || String(error) } : { ok: true, data };

export const localDayKey = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export async function listSavingPlans(uid) {
  if (!uid) return result(new Error("No user"));
  try {
    const snap = await getDocs(query(plansCol(uid), orderBy("createdAt", "desc")));
    return result(null, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) { return result(e); }
}

export async function saveSavingPlan(uid, plan) {
  if (!uid) return result(new Error("No user"));
  const data = {
    uid, name: plan.name.trim(), icon: plan.icon || "🎯", color: plan.color || "#4d96ff",
    targetAmount: Number(plan.targetAmount), dueDate: plan.dueDate,
    status: plan.status || "active", updatedAt: serverTimestamp(),
    completedAt: plan.status === "completed" ? (plan.completedAt || serverTimestamp()) : null,
  };
  try {
    if (plan.id) await setDoc(doc(db, "users", uid, "savingPlans", plan.id), data, { merge: true });
    else await addDoc(plansCol(uid), { ...data, createdAt: serverTimestamp() });
    return result(null);
  } catch (e) { return result(e); }
}

export async function restoreSavingPlan(uid, planId) {
  if (!uid || !planId) return result(new Error("Saving plan is required"));
  try {
    await updateDoc(doc(db, "users", uid, "savingPlans", planId), {
      status: "active", completedAt: null, updatedAt: serverTimestamp(),
    });
    return result(null);
  } catch (e) { return result(e); }
}

export async function completeSavingPlan(uid, planId) {
  if (!uid || !planId) return result(new Error("Saving plan is required"));
  try {
    await updateDoc(doc(db, "users", uid, "savingPlans", planId), {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return result(null);
  } catch (e) { return result(e); }
}

export async function deleteSavingPlan(uid, planId) {
  if (!uid || !planId) return result(new Error("Saving plan is required"));
  try {
    const linkedEntries = await getDocs(query(entriesCol(uid), where("planId", "==", planId)));
    await Promise.all([
      ...linkedEntries.docs.map((entry) => deleteDoc(entry.ref)),
      deleteDoc(doc(db, "users", uid, "savingPlans", planId)),
    ]);
    return result(null);
  } catch (e) { return result(e); }
}

export async function listSavingEntries(uid, { start, end } = {}) {
  if (!uid) return result(new Error("No user"));
  try {
    const rules = [orderBy("date", "asc")];
    if (start) rules.unshift(where("date", ">=", Timestamp.fromDate(start)));
    if (end) rules.unshift(where("date", "<", Timestamp.fromDate(end)));
    const snap = await getDocs(query(entriesCol(uid), ...rules));
    return result(null, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (e) { return result(e); }
}

export async function getSavingTotalsByPlan(uid, planIds = []) {
  if (!uid) return result(new Error("No user"));
  try {
    const totals = await Promise.all(planIds.map(async (planId) => {
      const snapshot = await getDocs(
        query(entriesCol(uid), where("planId", "==", planId))
      );
      const total = snapshot.docs.reduce(
        (value, entry) => value + Number(entry.data().amount || 0),
        0
      );
      return [planId, total];
    }));
    return result(null, Object.fromEntries(totals));
  } catch (e) { return result(e); }
}

export async function replaceSavingEntriesForDay(uid, dayKey, rows) {
  if (!uid) return result(new Error("No user"));
  if (rows.length > 4) return result(new Error("A day can have at most four savings."));
  try {
    const existing = await getDocs(query(entriesCol(uid), where("dayKey", "==", dayKey)));
    const batch = writeBatch(db);
    existing.docs.forEach((item) => batch.delete(item.ref));
    const date = new Date(`${dayKey}T12:00:00`);
    rows.forEach((row) => {
      const ref = doc(entriesCol(uid));
      batch.set(ref, { uid, planId: row.planId, amount: Number(row.amount), dayKey,
        date: Timestamp.fromDate(date), source: row.source || "manual",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
    return result(null);
  } catch (e) { return result(e); }
}

export async function addSavingEntry(uid, entry) {
  try {
    const date = entry.date instanceof Date ? entry.date : new Date(`${entry.dayKey}T12:00:00`);
    await addDoc(entriesCol(uid), { uid, planId: entry.planId, amount: Number(entry.amount),
      date: Timestamp.fromDate(date), dayKey: entry.dayKey || localDayKey(date), source: entry.source || "manual",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return result(null);
  } catch (e) { return result(e); }
}

export async function getDailySavingPrompt(uid) {
  try { const snap = await getDoc(doc(db, "users", uid, "financeMeta", "dailySavingPrompt")); return result(null, snap.exists() ? snap.data() : null); }
  catch (e) { return result(e); }
}

export async function markDailySavingPromptChecked(uid, checkedDayKey) {
  try { await setDoc(doc(db, "users", uid, "financeMeta", "dailySavingPrompt"), { lastCheckedDate: checkedDayKey, updatedAt: serverTimestamp() }, { merge: true }); return result(null); }
  catch (e) { return result(e); }
}

export async function deleteSavingEntry(uid, id) {
  try { await deleteDoc(doc(db, "users", uid, "savingEntries", id)); return result(null); } catch (e) { return result(e); }
}

export async function updateSavingEntry(uid, id, patch) {
  try { await updateDoc(doc(db, "users", uid, "savingEntries", id), { ...patch, updatedAt: serverTimestamp() }); return result(null); } catch (e) { return result(e); }
}
