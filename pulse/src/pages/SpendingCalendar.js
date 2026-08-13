import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { dayKey } from "../firestore/finance";
import { colors, fonts, radius, spacing, type } from "../theme";

// The web build expressed each cell's tint as a CSS class (green-1, red-2, …).
// React Native has no cascade, so the same five steps live here as style keys.
const TINTS = {
  empty:   { backgroundColor: colors.pulseBg,             borderColor: colors.border },
  neutral: { backgroundColor: "rgba(107,107,122,0.10)",   borderColor: "rgba(107,107,122,0.25)" },
  green1:  { backgroundColor: "rgba(47,158,122,0.14)",    borderColor: "rgba(47,158,122,0.30)" },
  green2:  { backgroundColor: "rgba(47,158,122,0.30)",    borderColor: "rgba(47,158,122,0.55)" },
  red1:    { backgroundColor: "rgba(214,69,69,0.18)",     borderColor: "rgba(214,69,69,0.40)" },
  red2:    { backgroundColor: "rgba(214,69,69,0.38)",     borderColor: "rgba(214,69,69,0.65)" },
};

/**
 * Daily-spending P&L calendar.
 *
 * For each day in the current month we sum the user's expenses for that
 * date and compare to a per-day allowance (= total monthly budget /
 * days in month). Cells turn green when spending was within the daily
 * allowance, red when over. Future dates are dimmed, today is marked with a
 * thick border.
 *
 * Props:
 *   expenses: same shape as listExpenses output, scoped to the month.
 *   monthStart: Date — first day of the month being shown.
 *   dailyAllowance: number — monthly budget / days in month. 0 = unset.
 */
function SpendingCalendar({ expenses = [], monthStart, dailyAllowance = 0 }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const monthGrid = useMemo(() => {
    if (!monthStart) return { cells: [], totalsByDay: {}, monthLength: 0 };

    const totalsByDay = {};
    for (const e of expenses) {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      const k = dayKey(d);
      totalsByDay[k] = (totalsByDay[k] || 0) + (e.amount || 0);
    }

    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
    const monthLength = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ blank: true, key: `pad-start-${i}` });
    }
    const today = new Date();
    const todayK = dayKey(today);
    for (let d = 1; d <= monthLength; d++) {
      const date = new Date(year, month, d);
      const k = dayKey(date);
      cells.push({
        date,
        key: k,
        spent: totalsByDay[k] || 0,
        isFuture: date > today && k !== todayK,
        isToday: k === todayK,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ blank: true, key: `pad-end-${cells.length}` });
    }

    return { cells, totalsByDay, monthLength };
  }, [expenses, monthStart]);

  // Translate a day's spend into one of a small set of tints.
  // Discrete steps look cleaner than a smooth gradient on tiny cells.
  const tintFor = (cell) => {
    if (cell.spent === 0) return TINTS.empty;
    if (dailyAllowance <= 0) return TINTS.neutral;
    const ratio = cell.spent / dailyAllowance;
    if (ratio <= 0.5) return TINTS.green1;
    if (ratio <= 1) return TINTS.green2;
    if (ratio <= 1.5) return TINTS.red1;
    return TINTS.red2;
  };

  const selected = selectedKey
    ? monthGrid.cells.find((c) => !c.blank && c.key === selectedKey)
    : null;

  // Explicit week rows rather than one wrapped grid. Android rounds each
  // child's width up to whole physical pixels, so seven cells at 100/7%
  // overflow the row and the last one wraps — the month renders six days wide
  // with the weekday header out of step. Rows of seven flex:1 cells divide
  // exactly on every platform. `cells` is already padded to a multiple of 7.
  const weeks = useMemo(() => {
    const out = [];
    for (let index = 0; index < monthGrid.cells.length; index += 7) {
      out.push(monthGrid.cells.slice(index, index + 7));
    }
    return out;
  }, [monthGrid.cells]);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.title}>Daily spending</Text>
          <Text style={styles.sub}>
            {dailyAllowance > 0
              ? `Allowance: $${dailyAllowance.toFixed(2)} / day`
              : "Set a budget to see your daily allowance"}
          </Text>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, TINTS.green2]} />
            <Text style={styles.legendText}>on track</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, TINTS.red1]} />
            <Text style={styles.legendText}>over</Text>
          </View>
        </View>
      </View>

      <View style={styles.weekdays}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View style={styles.week} key={`week-${weekIndex}`}>
        {week.map((cell) =>
          cell.blank ? (
            <View key={cell.key} style={styles.cell} />
          ) : (
            <Pressable
              key={cell.key}
              onPress={() => setSelectedKey((s) => (s === cell.key ? null : cell.key))}
              accessibilityRole="button"
              accessibilityLabel={`${cell.date.toDateString()}, $${cell.spent.toFixed(2)} spent`}
              accessibilityState={{ selected: selectedKey === cell.key }}
              style={[
                styles.cell,
                styles.cellFilled,
                tintFor(cell),
                cell.isFuture && styles.cellFuture,
                cell.isToday && styles.cellToday,
                selectedKey === cell.key && styles.cellSelected,
              ]}
            >
              <Text style={styles.day}>{cell.date.getDate()}</Text>
              {cell.spent > 0 ? (
                <Text style={styles.amount} numberOfLines={1}>
                  ${cell.spent.toFixed(0)}
                </Text>
              ) : null}
            </Pressable>
          )
        )}
        </View>
      ))}

      {selected ? (
        <View style={styles.detail}>
          <Text style={styles.detailTitle}>
            {selected.date.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
          <Text style={styles.detailText}>
            {selected.spent > 0 ? `Spent $${selected.spent.toFixed(2)}` : "No expenses logged"}
            {dailyAllowance > 0 && selected.spent > 0
              ? selected.spent <= dailyAllowance
                ? ` · $${(dailyAllowance - selected.spent).toFixed(2)} under`
                : ` · $${(selected.spent - dailyAllowance).toFixed(2)} over`
              : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  flex: { flex: 1 },

  head: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  title: { ...type.title, fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  sub: { ...type.caption, fontSize: 12, color: colors.textMuted },

  legend: { gap: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, borderWidth: 1 },
  legendText: { ...type.caption, fontSize: 10, color: colors.textMuted },

  // Seven equal columns per week row. `aspectRatio` keeps them square
  // regardless of the container width, which is what the CSS grid did on the
  // web. flex:1 rather than a 1/7 percentage — see the `weeks` comment above.
  weekdays: { flexDirection: "row" },
  weekday: {
    flex: 1,
    textAlign: "center",
    ...type.caption,
    fontSize: 10,
    color: colors.textMuted,
  },

  week: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  cellFilled: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 6,
  },
  cellFuture: { opacity: 0.4 },
  cellToday: { borderWidth: 2, borderColor: colors.pulsePrimaryDark },
  cellSelected: { borderWidth: 2, borderColor: colors.text },

  day: { ...type.caption, fontSize: 11, color: colors.text },
  amount: { ...type.caption, fontSize: 9, color: colors.textMuted },

  detail: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.pulseBg,
    gap: 2,
  },
  detailTitle: { ...type.label, fontSize: 13, color: colors.text },
  detailText: { ...type.small, color: colors.textMuted },
});

export default SpendingCalendar;
