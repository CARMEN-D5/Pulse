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
  { id: "food",          label: "Food",          icon: "🍜", color: "#E0546E" },
  { id: "transport",     label: "Transport",     icon: "🚌", color: "#4A6D98" },
  { id: "rent",          label: "Rent",          icon: "🏠", color: "#8E4570" },
  { id: "entertainment", label: "Entertainment", icon: "🎬", color: "#D4A94C" },
  { id: "other",         label: "Other",         icon: "💸", color: "#5A8A4A" },
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
      // Which account / payment method this came out of. Stored as the
      // account doc id so renaming the account later doesn't orphan
      // historical expenses.
      account: expense.account || "",
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

/** Number of days in the calendar month containing `date`. */
export function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** YYYY-MM-DD key used to bucket expenses by day in the calendar. */
export function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ===========================================================================
// Accounts (bank account / payment method)
// ===========================================================================

/**
 * Default accounts seeded the first time a user visits Finance. Once seeded,
 * the user fully owns this list — they can rename, recolor, add or delete.
 */
export const DEFAULT_ACCOUNTS = [
  { id: "everyday", name: "Everyday",   icon: "💳", color: "#4A6D98" },
  { id: "savings",  name: "Savings",    icon: "🏦", color: "#5A8A4A" },
  { id: "credit",   name: "Credit Card", icon: "🪪", color: "#8E4570" },
  { id: "cash",     name: "Cash",       icon: "💵", color: "#D4A94C" },
];

function accountsCol(uid) {
  return collection(db, "users", uid, "accounts");
}

/** List all of a user's accounts. Returns [] if none exist yet. */
export async function getAccounts(uid) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const snap = await getDocs(accountsCol(uid));
    const out = [];
    snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
    return { ok: true, data: out };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Create the default accounts on first visit. Idempotent — checks the
 * collection first and only writes if it's empty.
 */
export async function ensureDefaultAccounts(uid) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    const snap = await getDocs(accountsCol(uid));
    if (!snap.empty) return { ok: true, data: snap.size };

    await Promise.all(
      DEFAULT_ACCOUNTS.map((a) =>
        setDoc(doc(db, "users", uid, "accounts", a.id), {
          ...a,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );
    return { ok: true, seeded: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Create or replace an account. */
export async function saveAccount(uid, account) {
  if (!uid) return { ok: false, error: "No user" };
  if (!account?.id) return { ok: false, error: "Account id is required" };
  try {
    await setDoc(
      doc(db, "users", uid, "accounts", account.id),
      {
        id: account.id,
        name: account.name || "Untitled",
        icon: account.icon || "💳",
        color: account.color || "#4A6D98",
        updatedAt: serverTimestamp(),
        createdAt: account.createdAt || serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Permanently remove an account. Existing expenses keep their account id
 *  string and just render with a fallback icon. */
export async function deleteAccount(uid, accountId) {
  if (!uid) return { ok: false, error: "No user" };
  try {
    await deleteDoc(doc(db, "users", uid, "accounts", accountId));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

/** Look up an account in a list by id, with a soft fallback. */
export function accountById(accounts, id) {
  if (!id) return { id: "", name: "—", icon: "•", color: "#bbb" };
  return (
    accounts.find((a) => a.id === id) || {
      id,
      name: id,
      icon: "•",
      color: "#bbb",
    }
  );
}
