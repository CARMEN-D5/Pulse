import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import DateField from "../components/DateField";
import Icon from "../components/Icon";
import { Alert, PrimaryButton, Screen, ScreenHeader } from "../components/ui";
import { ShareButton } from "../components/share";
import SavingView from "./SavingView";
import {
  accountById,
  addExpense,
  categoryById,
  daysInMonth,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  deleteAccount,
  deleteExpense,
  ensureDefaultAccounts,
  getAccounts,
  getBudgets,
  listExpenses,
  monthBounds,
  monthLabel,
  saveAccount,
  setBudget,
} from "../firestore/finance";
import { logAction } from "../firestore/scoring";
import { colors, fonts, radius, shadow, spacing, type } from "../theme";
import DonutChart from "./DonutChart";
import SpendingCalendar from "./SpendingCalendar";

// Preset palette standing in for the web build's <input type="color">.
// React Native has no native colour picker, and a swatch grid is faster to use
// on a phone than a hue wheel anyway.
const ACCOUNT_COLORS = [
  "#4d96ff", "#2f9e7a", "#c9184a", "#f57c00",
  "#983f72", "#086a69", "#5a6550", "#4e607f",
];

/**
 * Finance / budget tracker page.
 *
 * Layout (top -> bottom):
 *   - Header (back, title, settings cog)
 *   - Donut chart + legend (this-month spending split by category)
 *   - Spending P&L calendar (per-day vs daily allowance)
 *   - Per-category progress bars vs each budget cap
 *   - Add expense form (amount + category + account + date + note)
 *   - Recent transactions with delete
 *   - Settings modal: Budgets tab + Accounts tab
 */
function Finance({ user, onBack, onActivityLogged }) {
  const uid = user?.uid;

  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({}); // { category: { monthlyLimit } }
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [financeTab, setFinanceTab] = useState("spending");

  const { monthStart, monthEnd } = useMemo(() => monthBounds(), []);
  const monthName = useMemo(() => monthLabel(), []);
  const monthDayCount = useMemo(() => daysInMonth(), []);

  // ---- load --------------------------------------------------------------
  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    setError("");
    // Seed default accounts on first visit. Idempotent.
    await ensureDefaultAccounts(uid);
    const [exp, bud, acc] = await Promise.all([
      listExpenses(uid, { monthStart, monthEnd }),
      getBudgets(uid),
      getAccounts(uid),
    ]);
    if (!exp.ok) setError(exp.error || "Could not load expenses.");
    else if (!bud.ok) setError(bud.error || "Could not load budgets.");
    else if (!acc.ok) setError(acc.error || "Could not load accounts.");
    setExpenses(exp.data || []);
    setBudgets(bud.data || {});
    setAccounts(acc.data?.length ? acc.data : DEFAULT_ACCOUNTS);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // ---- aggregations ------------------------------------------------------
  const spentByCategory = useMemo(() => {
    const out = {};
    for (const c of DEFAULT_CATEGORIES) out[c.id] = 0;
    for (const e of expenses) {
      out[e.category] = (out[e.category] || 0) + (e.amount || 0);
    }
    return out;
  }, [expenses]);

  const totalSpent = useMemo(
    () => Object.values(spentByCategory).reduce((a, b) => a + b, 0),
    [spentByCategory]
  );

  const totalBudget = useMemo(
    () => DEFAULT_CATEGORIES.reduce((acc, c) => acc + (budgets[c.id]?.monthlyLimit || 0), 0),
    [budgets]
  );

  const dailyAllowance = useMemo(
    () => (totalBudget > 0 ? totalBudget / monthDayCount : 0),
    [totalBudget, monthDayCount]
  );

  // Payload for the manual share button. `isAvailable` on the finance
  // templates requires totalBudget > 0, so the button hides itself until the
  // user has actually set some budgets.
  //
  // For a single category instead, the payload is:
  //   { kind: "category-under", categoryLabel, categoryIcon, categoryColor,
  //     spent, cap, monthLabel }
  const monthSharePayload = {
    kind: "month-under",
    monthLabel: monthName,
    totalSpent,
    totalBudget,
  };

  // Categories sorted by this-month spend, descending. Ties keep their
  // original order. Used to rank both the donut legend and (filtered to
  // non-zero) the donut chart slices, so the most prevalent category sits
  // at the top of the legend list.
  const rankedCategories = useMemo(
    () =>
      [...DEFAULT_CATEGORIES].sort(
        (a, b) => (spentByCategory[b.id] || 0) - (spentByCategory[a.id] || 0)
      ),
    [spentByCategory]
  );

  const donutData = useMemo(
    () =>
      rankedCategories
        .filter((c) => spentByCategory[c.id] > 0)
        .map((c) => ({
          id: c.id,
          label: c.label,
          value: spentByCategory[c.id],
          color: c.color,
        })),
    [rankedCategories, spentByCategory]
  );

  // Track most-recently-used account so the form can preselect it.
  const lastUsedAccount = useMemo(() => {
    const e = expenses.find((x) => x.account);
    return e?.account || accounts[0]?.id || "";
  }, [expenses, accounts]);

  // ---- handlers ----------------------------------------------------------
  const handleAddExpense = async (payload) => {
    const res = await addExpense(uid, payload);
    if (!res.ok) {
      setError(res.error || "Couldn't save the expense.");
      return false;
    }
    logAction(uid, "finance", "expense");
    onActivityLogged?.();
    await refresh();
    return true;
  };

  const handleDelete = async (id) => {
    const res = await deleteExpense(uid, id);
    if (!res.ok) setError(res.error || "Couldn't delete that.");
    await refresh();
  };

  const handleSaveBudgets = async (next) => {
    const writes = Object.entries(next).map(([cat, lim]) => setBudget(uid, cat, lim));
    const results = await Promise.all(writes);
    const fail = results.find((r) => !r.ok);
    if (fail) setError(fail.error || "Couldn't save budgets.");
    await refresh();
  };

  const handleSaveAccounts = async (nextAccounts, deletedIds) => {
    for (const id of deletedIds) {
      const res = await deleteAccount(uid, id);
      if (!res.ok) setError(res.error || "Couldn't delete account.");
    }
    for (const a of nextAccounts) {
      const res = await saveAccount(uid, a);
      if (!res.ok) setError(res.error || "Couldn't save account.");
    }
    await refresh();
  };

  // ---- render ------------------------------------------------------------
  return (
    <Screen contentContainerStyle={styles.screen}>
      <ScreenHeader
        title="Budget"
        subtitle={monthName}
        onBack={onBack}
        right={
          financeTab === "spending" ? (
            <View style={styles.headerActions}>
              {/* finance only uses the manual share trigger — an automatic
                  prompt about budgeting is unlikely to be welcome */}
              <ShareButton domain="finance" payload={monthSharePayload} />
              <Pressable
                onPress={() => setShowSettings(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={({ pressed }) => [styles.cogBtn, pressed && styles.pressed]}
              >
                <Icon name="settings" size={20} color={colors.text} />
              </Pressable>
            </View>
          ) : null
        }
      />

      <Alert message={error} />

      <View style={styles.tabs} accessibilityRole="tablist">
        <ModalTab
          label="Spending"
          active={financeTab === "spending"}
          onPress={() => setFinanceTab("spending")}
        />
        <ModalTab
          label="Saving"
          active={financeTab === "saving"}
          onPress={() => setFinanceTab("saving")}
        />
      </View>

      {financeTab === "saving" ? (
        <SavingView uid={uid} totalBudget={totalBudget} onError={setError} />
      ) : (
        <>
      {/* ---------- Chart + legend ---------- */}
      <View style={[styles.card, shadow("sm")]}>
        <View style={styles.summary}>
          <DonutChart
            data={donutData}
            size={220}
            thickness={28}
            centerLabel={`$${totalSpent.toFixed(0)}`}
            centerSub={totalBudget > 0 ? `of $${totalBudget.toFixed(0)}` : "spent this month"}
          />

          <View style={styles.legend}>
            {rankedCategories.map((c) => (
              <View style={styles.legendRow} key={c.id}>
                <View style={[styles.legendSwatch, { backgroundColor: c.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {c.icon} {c.label}
                </Text>
                <Text style={styles.legendAmount}>${spentByCategory[c.id].toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ---------- Daily P&L calendar ---------- */}
      <View style={[styles.card, shadow("sm")]}>
        <SpendingCalendar
          expenses={expenses}
          monthStart={monthStart}
          dailyAllowance={dailyAllowance}
        />
      </View>

      {/* ---------- Per-category bars ---------- */}
      <View style={[styles.card, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Category limits</Text>

        <View style={styles.budgetRows}>
          {DEFAULT_CATEGORIES.map((c) => {
            const cap = budgets[c.id]?.monthlyLimit || 0;
            const spent = spentByCategory[c.id];
            const ratio = cap > 0 ? spent / cap : 0;
            const pct = Math.min(ratio, 1) * 100;
            return (
              <View key={c.id} style={styles.budgetRow}>
                <View style={styles.budgetRowHead}>
                  <Text style={styles.budgetRowName}>
                    {c.icon} {c.label}
                  </Text>
                  <Text style={styles.budgetRowAmount}>
                    ${spent.toFixed(0)}
                    {cap > 0 ? ` / $${cap.toFixed(0)}` : " · no budget set"}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[styles.barFill, { width: `${pct}%`, backgroundColor: c.color }]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ---------- Add expense ---------- */}
      <View style={[styles.card, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Add an expense</Text>
        <AddExpenseForm
          accounts={accounts}
          defaultAccount={lastUsedAccount}
          onSubmit={handleAddExpense}
        />
      </View>

      {/* ---------- Recent transactions ---------- */}
      <View style={[styles.card, shadow("sm")]}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>

        {loading ? (
          <Text style={styles.emptyState}>Loading…</Text>
        ) : expenses.length === 0 ? (
          <Text style={styles.emptyState}>No expenses yet — add one above to get started.</Text>
        ) : (
          <View style={styles.txList}>
            {expenses.slice(0, 12).map((e) => {
              const cat = categoryById(e.category);
              const acc = accountById(accounts, e.account);
              const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
              return (
                <View key={e.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: `${cat.color}22` }]}>
                    <Text style={styles.txIconText}>{cat.icon}</Text>
                  </View>

                  <View style={styles.flex}>
                    <View style={styles.txCatRow}>
                      <View style={[styles.txAccountIcon, { backgroundColor: `${acc.color}22` }]}>
                        <Text style={styles.txAccountIconText}>{acc.icon}</Text>
                      </View>
                      <Text style={styles.txCat}>{cat.label}</Text>
                    </View>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {acc.name} ·{" "}
                      {date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      {e.note ? ` · ${e.note}` : ""}
                    </Text>
                  </View>

                  <Text style={styles.txAmount}>${e.amount.toFixed(2)}</Text>

                  <Pressable
                    onPress={() => handleDelete(e.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Delete expense"
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    <Icon name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </View>
        </>
      )}

      <SettingsModal
        visible={showSettings}
        budgets={budgets}
        accounts={accounts}
        onSaveBudgets={handleSaveBudgets}
        onSaveAccounts={handleSaveAccounts}
        onClose={() => setShowSettings(false)}
      />
    </Screen>
  );
}

// ============================================================================
// Add expense sub-component
// ============================================================================

function AddExpenseForm({ accounts, defaultAccount, onSubmit }) {
  const todayIso = useMemo(() => {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }, []);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [account, setAccount] = useState(defaultAccount || "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayIso);
  const [submitting, setSubmitting] = useState(false);

  // If parent learns a better default after first render, sync it.
  useEffect(() => {
    if (defaultAccount && !account) setAccount(defaultAccount);
  }, [defaultAccount, account]);

  const canSubmit = Number(amount) > 0 && Boolean(account) && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const ok = await onSubmit({
      amount: Number(amount),
      category,
      account,
      note,
      date,
    });
    setSubmitting(false);
    if (ok) {
      setAmount("");
      setNote("");
      setCategory("food");
      // keep account selection for the next entry — most people use the
      // same account multiple times in a row
      setDate(todayIso);
    }
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.amountInput}
        keyboardType="decimal-pad"
        placeholder="$0.00"
        placeholderTextColor={colors.textMuted}
        value={amount}
        onChangeText={setAmount}
        accessibilityLabel="Amount"
      />

      <View style={styles.chipWrap} accessibilityRole="radiogroup" accessibilityLabel="Category">
        {DEFAULT_CATEGORIES.map((c) => {
          const selected = category === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategory(c.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.chip,
                selected && { backgroundColor: `${c.color}22`, borderColor: c.color },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, selected && { color: c.color, fontFamily: fonts.semibold }]}>
                {c.icon} {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chipWrap} accessibilityRole="radiogroup" accessibilityLabel="Account">
        {accounts.map((a) => {
          const selected = account === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAccount(a.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.chip,
                selected && { backgroundColor: `${a.color}22`, borderColor: a.color },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.accountSwatch, { backgroundColor: a.color }]} />
              <Text style={[styles.chipText, selected && { fontFamily: fonts.semibold }]}>
                {a.icon} {a.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DateField value={date} onChange={setDate} clearable={false} />

      <TextInput
        style={styles.input}
        placeholder="Note (optional)"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
      />

      <PrimaryButton
        label={submitting ? "Adding…" : "Add expense"}
        onPress={submit}
        disabled={!canSubmit}
        loading={submitting}
      />
    </View>
  );
}

// ============================================================================
// Settings modal: Budgets tab + Accounts tab
// ============================================================================

function SettingsModal({ visible, budgets, accounts, onSaveBudgets, onSaveAccounts, onClose }) {
  const [tab, setTab] = useState("budgets");

  // ----- Budgets tab state -----
  const [budgetDraft, setBudgetDraft] = useState({});

  // ----- Accounts tab state -----
  // Working copy of accounts so edits don't hit Firestore until "Save".
  const [acctDraft, setAcctDraft] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);

  const [saving, setSaving] = useState(false);

  // The web version seeded these in useState initialisers, which only run on
  // first mount. A <Modal> stays mounted between opens, so the drafts are
  // reseeded each time it becomes visible instead — otherwise reopening
  // settings would show stale values from the last edit.
  useEffect(() => {
    if (!visible) return;
    const out = {};
    for (const c of DEFAULT_CATEGORIES) {
      out[c.id] = String(budgets?.[c.id]?.monthlyLimit || "");
    }
    setBudgetDraft(out);
    setAcctDraft(accounts.map((a) => ({ ...a })));
    setDeletedIds([]);
  }, [visible, budgets, accounts]);

  // ---- handlers ----
  const saveBudgets = async () => {
    setSaving(true);
    const next = {};
    for (const k of Object.keys(budgetDraft)) {
      next[k] = Number(budgetDraft[k]) || 0;
    }
    await onSaveBudgets(next);
    setSaving(false);
    onClose();
  };

  const saveAccounts = async () => {
    setSaving(true);
    await onSaveAccounts(acctDraft, deletedIds);
    setSaving(false);
    onClose();
  };

  const updateAcct = (idx, patch) => {
    setAcctDraft((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const deleteAcct = (idx) => {
    const a = acctDraft[idx];
    setDeletedIds((d) => (a.id ? [...d, a.id] : d));
    setAcctDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAcct = () => {
    const newId = `acc-${Date.now().toString(36)}`;
    setAcctDraft((prev) => [
      ...prev,
      { id: newId, name: "New account", icon: "💳", color: "#4d96ff" },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings" />

      <View style={styles.modalCard} accessibilityViewIsModal accessibilityLabel="Settings">
        <Text style={styles.modalTitle}>Settings</Text>

        <View style={styles.tabs} accessibilityRole="tablist">
          <ModalTab label="Budgets" active={tab === "budgets"} onPress={() => setTab("budgets")} />
          <ModalTab
            label="Accounts"
            active={tab === "accounts"}
            onPress={() => setTab("accounts")}
          />
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "budgets" ? (
            <>
              <Text style={styles.modalHint}>
                Set the most you want to spend in each category each month.
              </Text>

              {DEFAULT_CATEGORIES.map((c) => (
                <View key={c.id} style={styles.budgetEditRow}>
                  <Text style={styles.budgetEditLabel} numberOfLines={1}>
                    {c.icon} {c.label}
                  </Text>
                  <Text style={styles.currency}>$</Text>
                  <TextInput
                    style={styles.budgetEditInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={budgetDraft[c.id] ?? ""}
                    onChangeText={(v) => setBudgetDraft((d) => ({ ...d, [c.id]: v }))}
                    accessibilityLabel={`${c.label} monthly limit`}
                  />
                </View>
              ))}
            </>
          ) : (
            <>
              <Text style={styles.modalHint}>
                Manage the bank accounts and payment methods you spend from.
              </Text>

              {acctDraft.map((a, i) => (
                <View key={a.id} style={styles.accountEditRow}>
                  <View style={styles.accountEditTop}>
                    <TextInput
                      style={styles.accIcon}
                      value={a.icon}
                      onChangeText={(v) => updateAcct(i, { icon: v.slice(0, 2) })}
                      accessibilityLabel="Icon"
                    />
                    <TextInput
                      style={[styles.input, styles.flex]}
                      value={a.name}
                      onChangeText={(v) => updateAcct(i, { name: v })}
                      accessibilityLabel="Account name"
                    />
                    <Pressable
                      onPress={() => deleteAcct(i)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete account"
                      style={({ pressed }) => [pressed && styles.pressed]}
                    >
                      <Icon name="close" size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  {/* Colour picker: preset swatches instead of a hue wheel. */}
                  <View style={styles.swatchRow}>
                    {ACCOUNT_COLORS.map((color) => (
                      <Pressable
                        key={color}
                        onPress={() => updateAcct(i, { color })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: a.color === color }}
                        accessibilityLabel={`Colour ${color}`}
                        style={[
                          styles.swatch,
                          { backgroundColor: color },
                          a.color === color && styles.swatchSelected,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ))}

              <Pressable
                onPress={addAcct}
                accessibilityRole="button"
                style={({ pressed }) => [styles.addAccountBtn, pressed && styles.pressed]}
              >
                <Text style={styles.addAccountText}>+ Add account</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </Pressable>
          <PrimaryButton
            label={saving ? "Saving…" : "Save"}
            onPress={tab === "budgets" ? saveBudgets : saveAccounts}
            loading={saving}
            style={styles.flex}
          />
        </View>
      </View>
    </Modal>
  );
}

function ModalTab({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md, paddingBottom: 40 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },

  cogBtn: { padding: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.glass },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  emptyState: { ...type.small, color: colors.textMuted, paddingVertical: spacing.md },

  summary: { alignItems: "center", gap: spacing.lg },
  legend: { width: "100%", gap: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendSwatch: { width: 10, height: 10, borderRadius: radius.pill },
  legendLabel: { ...type.small, flex: 1, color: colors.text },
  legendAmount: { ...type.label, fontSize: 13, color: colors.text },

  budgetRows: { gap: spacing.md },
  budgetRow: { gap: 6 },
  budgetRowHead: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  budgetRowName: { ...type.small, flex: 1, color: colors.text },
  budgetRowAmount: { ...type.caption, fontSize: 12, color: colors.textMuted },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.pulseBgTintAlt,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: radius.pill },

  form: { gap: spacing.md },
  amountInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: "center",
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    ...type.body,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.7)",
  },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pulseBg,
  },
  chipText: { ...type.small, fontSize: 13, color: colors.text },
  accountSwatch: { width: 8, height: 8, borderRadius: radius.pill },

  txList: { gap: spacing.sm },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  txIconText: { fontSize: 16 },
  txCatRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  txAccountIcon: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  txAccountIconText: { fontSize: 10 },
  txCat: { ...type.label, fontSize: 13, color: colors.text },
  txMeta: { ...type.caption, fontSize: 11, color: colors.textMuted },
  txAmount: { ...type.label, fontFamily: fonts.bold, fontSize: 14, color: colors.text },

  backdrop: { flex: 1, backgroundColor: colors.overlay },
  modalCard: {
    maxHeight: "80%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalTitle: { ...type.h3, color: colors.text },
  modalBody: { flexGrow: 0 },
  modalBodyContent: { gap: spacing.md },
  modalHint: { ...type.small, color: colors.textMuted },

  tabs: { flexDirection: "row", gap: 6 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.blPrimary, borderColor: colors.blPrimary },
  tabText: { ...type.small, color: colors.text },
  tabTextActive: { color: "#fff", fontFamily: fonts.semibold },

  budgetEditRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  budgetEditLabel: { ...type.small, flex: 1, color: colors.text },
  currency: { ...type.small, color: colors.textMuted },
  budgetEditInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    ...type.body,
    fontSize: 14,
    textAlign: "right",
    color: colors.text,
  },

  accountEditRow: { gap: spacing.sm },
  accountEditTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  accIcon: {
    width: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: "center",
    color: colors.text,
  },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatch: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 2, borderColor: "transparent" },
  swatchSelected: { borderColor: colors.text },

  addAccountBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.blPrimary,
  },
  addAccountText: { ...type.label, color: colors.blPrimary },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  ghostBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostBtnText: { ...type.title, fontSize: 16, color: colors.textMuted },
});

export default Finance;
