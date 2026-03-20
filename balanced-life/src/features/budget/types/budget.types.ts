/**
 * Budget / Income & Expense Tracker type definitions.
 */

export type TransactionType = "income" | "expense";

export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "bills"
  | "health"
  | "entertainment"
  | "education"
  | "other";

export type IncomeCategory =
  | "salary"
  | "freelance"
  | "gift"
  | "refund"
  | "other_income";

export type TransactionCategory = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number; // always positive
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export interface CategoryOption {
  category: TransactionCategory;
  label: string;
  emoji: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryOption[] = [
  { category: "food", label: "Food", emoji: "🍔", color: "#EF4444" },
  { category: "transport", label: "Transport", emoji: "🚗", color: "#3B82F6" },
  { category: "shopping", label: "Shopping", emoji: "🛍️", color: "#EC4899" },
  { category: "bills", label: "Bills", emoji: "📄", color: "#6366F1" },
  { category: "health", label: "Health", emoji: "💊", color: "#22C55E" },
  { category: "entertainment", label: "Entertainment", emoji: "🎬", color: "#F59E0B" },
  { category: "education", label: "Education", emoji: "📚", color: "#8B5CF6" },
  { category: "other", label: "Other", emoji: "📦", color: "#6B7280" },
];

export const INCOME_CATEGORIES: CategoryOption[] = [
  { category: "salary", label: "Salary", emoji: "💼", color: "#22C55E" },
  { category: "freelance", label: "Freelance", emoji: "💻", color: "#3B82F6" },
  { category: "gift", label: "Gift", emoji: "🎁", color: "#EC4899" },
  { category: "refund", label: "Refund", emoji: "🔄", color: "#F59E0B" },
  { category: "other_income", label: "Other", emoji: "💰", color: "#6B7280" },
];

/** All category options for quick lookup */
export const ALL_CATEGORIES: CategoryOption[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

export interface MonthSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  /** Spending per expense category */
  categoryBreakdown: Record<string, number>;
}

export const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200, 500];
