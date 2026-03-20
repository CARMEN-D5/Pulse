/**
 * Budget Service — Firestore CRUD for income & expense transactions.
 * Collection: users/{uid}/expenses/{id}
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  MonthSummary,
  EXPENSE_CATEGORIES,
} from "../types/budget.types";

// ── Helpers ──

function txCollection(userId: string) {
  return collection(db, "users", userId, "expenses");
}

function toYYYYMM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Log a transaction ──

export async function logTransaction(
  userId: string,
  type: TransactionType,
  category: TransactionCategory,
  amount: number,
  note: string
): Promise<Transaction> {
  const now = new Date();
  const entry: Omit<Transaction, "id"> = {
    type,
    category,
    amount: Math.abs(amount),
    note: note.trim(),
    date: todayStr(),
    createdAt: now.toISOString(),
  };

  const ref = await addDoc(txCollection(userId), entry);
  return { id: ref.id, ...entry };
}

// ── Fetch transactions for a month ──

export async function fetchMonthTransactions(
  userId: string,
  year: number,
  month: number // 1-12
): Promise<Transaction[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const q = query(
    txCollection(userId),
    where("date", ">=", startDate),
    where("date", "<", endDate),
    orderBy("date", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

// ── Fetch recent transactions (any month) ──

export async function fetchRecentTransactions(
  userId: string,
  count: number = 20
): Promise<Transaction[]> {
  const q = query(
    txCollection(userId),
    orderBy("createdAt", "desc"),
    limit(count)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
}

// ── Compute month summary ──

export function computeMonthSummary(transactions: Transaction[]): MonthSummary {
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryBreakdown: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
      categoryBreakdown[tx.category] =
        (categoryBreakdown[tx.category] ?? 0) + tx.amount;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    categoryBreakdown,
  };
}

// ── Format currency (AUD) ──

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
