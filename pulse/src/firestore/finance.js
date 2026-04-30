// src/firestore/finance.js
//
// Firestore helpers for the budget tracker.
//
// Data model (all per-user, nested under users/{uid}):
//
//   users/{uid}/budgets/{category}     One doc per category that John has
//                                      set a monthly cap for.
//     { category, monthlyLimit, updatedAt }
//
//   users/{uid}/expenses/{expenseId}   One doc per logged transaction.
//     { amount, category, note, date, source, createdAt }
//
// Why nested under the user doc? Security rules become trivial — anyone
// with request.auth.uid == uid can read/write under their own subtree —
// and queries are automatically scoped to the right user.

import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** The default category set John starts with. Custom categories are a v2. */
export const DEFAULT_CATEGORIES = [
  { id: "food",          label: "Food",          icon: "🍜", color: "#ff6b6b" },
  { id: "transport",     label: "Transport",     icon: "🚌", color: "#4d96ff" },
  { id: "rent",          label: "Rent",          icon: "🏠", color: "#9b5de5" },
  { id: "entertainment", label: "Entertainment", icon: "🎬", color: "#f6c453" },
  { id: "other",         label: "Other",         icon: "💸", color: "#80b918" },
];

export function categoryById(id) {
  return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[4];
}

// ---------------------------------------------------------------------------
// Refs
// ---------------------------------------------------------------------------

function budgetsCol(uid) {
  return collection(db, "users", uid, "budgets");
}

function expensesCol(uid) {
  return collection(db, "users", uid, "expenses");
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

/** Read all budgets for a user. Returns a map keyed by category id. */
export async function getBudgets(uid) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const snap = await getDocs(budgetsCol(uid));
    const out = {};
    snap.forEach((d) => {
      out[d.id] = d.data();
    });
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Create or replace the cap for one category. */
export async function setBudget(uid, category, monthlyLimit) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const ref = doc(db, "users", uid, "budgets", category);
    await setDoc(
      ref,
      {
        category,
        monthlyLimit: Number(monthlyLimit) || 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/**
 * Add a new expense. `date` may be a JS Date or an ISO string; we normalise
 * to a Firestore Timestamp so range queries work.
 */
export async function addExpense(uid, expense) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const date =
      expense.date instanceof Date
        ? expense.date
        : expense.date
        ? new Date(expense.date)
        : new Date();

    await addDoc(expensesCol(uid), {
      amount: Number(expense.amount) || 0,
      category: expense.category || "other",
      note: expense.note?.trim() || "",
      date: Timestamp.fromDate(date),
      // Future-proof: tag the source so CSV / bank imports can join later
      // without us needing to migrate existing rows.
      source: expense.source || "manual",
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * List expenses, newest first. Pass `monthStart`/`monthEnd` to scope to a
 * specific month — used by the dashboard to compute "spent this month".
 */
export async function listExpenses(uid, { monthStart, monthEnd } = {}) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const constraints = [orderBy("date", "desc")];
    if (monthStart && monthEnd) {
      constraints.unshift(
        where("date", ">=", Timestamp.fromDate(monthStart)),
        where("date", "<", Timestamp.fromDate(monthEnd))
      );
    }
    const q = query(expensesCol(uid), ...constraints);
    const snap = await getDocs(q);
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Delete a single expense by id. */
export async function deleteExpense(uid, expenseId) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    await deleteDoc(doc(db, "users", uid, "expenses", expenseId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** [start, end) bounds for the calendar month containing `date` (default: today). */
export function monthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { monthStart: start, monthEnd: end };
}

/** Pretty label like "April 2026". */
export function monthLabel(date = new Date()) {
  return date.toLocaleString("en-AU", { month: "long", year: "numeric" });
}
