import React, { useMemo, useState } from "react";
import { dayKey } from "../firestore/finance";

/**
 * Daily-spending P&L calendar.
 *
 * For each day in the current month we sum the user's expenses for that
 * date and compare to a per-day allowance (= total monthly budget /
 * days in month). Cells turn green when spending was within the daily
 * allowance, red when over. Future dates are outlined-only, today is
 * marked with a thick border.
 *
 * Props:
 *   expenses: same shape as listExpenses output, scoped to the month.
 *   monthStart: Date — first day of the month being shown.
 *   dailyAllowance: number — monthly budget / days in month. 0 = unset.
 */
function SpendingCalendar({ expenses = [], monthStart, dailyAllowance = 0 }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const monthGrid = useMemo(() => {
    if (!monthStart) return { rows: [], totalsByDay: {}, monthLength: 0 };

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
    const todayKey = dayKey(today);
    for (let d = 1; d <= monthLength; d++) {
      const date = new Date(year, month, d);
      const k = dayKey(date);
      cells.push({
        date,
        key: k,
        spent: totalsByDay[k] || 0,
        isFuture: date > today && k !== todayKey,
        isToday: k === todayKey,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ blank: true, key: `pad-end-${cells.length}` });
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return { rows, totalsByDay, monthLength };
  }, [expenses, monthStart]);

  // Translate a day's spend into one of a small set of CSS class tints.
  // Discrete steps look cleaner than a smooth gradient on tiny cells.
  const cellClass = (cell) => {
    if (cell.blank) return "cal-cell blank";
    let classes = "cal-cell";
    if (cell.isFuture) classes += " future";
    if (cell.isToday) classes += " today";
    if (cell.spent === 0) classes += " empty";
    else if (dailyAllowance <= 0) classes += " neutral";
    else {
      const ratio = cell.spent / dailyAllowance;
      if (ratio <= 0.5) classes += " green-1";
      else if (ratio <= 1) classes += " green-2";
      else if (ratio <= 1.5) classes += " red-1";
      else classes += " red-2";
    }
    if (selectedKey === cell.key) classes += " selected";
    return classes;
  };

  const selected =
    selectedKey && monthGrid.rows
      ? monthGrid.rows
          .flat()
          .find((c) => !c.blank && c.key === selectedKey)
      : null;

  return (
    <div className="spending-calendar">
      <div className="cal-head">
        <div>
          <div className="cal-title">Daily spending</div>
          <div className="cal-sub">
            {dailyAllowance > 0
              ? `Allowance: $${dailyAllowance.toFixed(2)} / day`
              : "Set a budget to see your daily allowance"}
          </div>
        </div>
        <div className="cal-legend">
          <span><i className="dot green-2" /> on track</span>
          <span><i className="dot red-1" /> over</span>
        </div>
      </div>

      <div className="cal-weekdays">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="cal-grid">
        {monthGrid.rows.flat().map((cell) =>
          cell.blank ? (
            <div key={cell.key} className="cal-cell blank" />
          ) : (
            <button
              type="button"
              key={cell.key}
              className={cellClass(cell)}
              onClick={() =>
                setSelectedKey((s) => (s === cell.key ? null : cell.key))
              }
              aria-label={`${cell.date.toDateString()}, $${cell.spent.toFixed(2)} spent`}
            >
              <span className="cal-day">{cell.date.getDate()}</span>
              {cell.spent > 0 && (
                <span className="cal-amt">${cell.spent.toFixed(0)}</span>
              )}
            </button>
          )
        )}
      </div>

      {selected && (
        <div className="cal-detail">
          <strong>
            {selected.date.toLocaleDateString("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </strong>
          <span>
            {selected.spent > 0
              ? `Spent $${selected.spent.toFixed(2)}`
              : "No expenses logged"}
            {dailyAllowance > 0 && selected.spent > 0
              ? selected.spent <= dailyAllowance
                ? ` · $${(dailyAllowance - selected.spent).toFixed(2)} under`
                : ` · $${(selected.spent - dailyAllowance).toFixed(2)} over`
              : ""}
          </span>
        </div>
      )}
    </div>
  );
}

export default SpendingCalendar;
