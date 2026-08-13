// Month grid of saving records.
//
// Two web-only techniques had to be replaced here. The single-vs-double click
// disambiguation timer becomes tap (view) / long press (edit), and the
// `conic-gradient` that split a day's cell between plans becomes a stripe of
// equal-flex bars — one per entry, in that plan's colour.
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { localDayKey } from "../firestore/savings";
import { PrimaryButton } from "../components/ui";
import { colors, fonts, radius, spacing, type } from "../theme";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function SavingCalendar({
  monthStart,
  entries,
  plans,
  hasActivePlans,
  canViewNextMonth,
  onPreviousMonth,
  onNextMonth,
  onViewDay,
  onEditDay,
  onAddPlan,
}) {
  const planMap = useMemo(
    () => Object.fromEntries(plans.map((plan) => [plan.id, plan])),
    [plans]
  );

  const byDay = useMemo(
    () =>
      entries.reduce((out, entry) => {
        (out[entry.dayKey] ||= []).push(entry);
        return out;
      }, {}),
    [entries]
  );

  const cells = useMemo(() => {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const result = [];

    for (let index = 0; index < new Date(year, month, 1).getDay(); index++) {
      result.push({ blank: true, key: `blank-${index}` });
    }
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const date = new Date(year, month, day);
      const key = localDayKey(date);
      result.push({ date, key, entries: byDay[key] || [] });
    }
    return result;
  }, [monthStart, byDay]);

  // Chunked into explicit week rows rather than wrapped with percentage
  // widths. Android rounds each child's width up to whole physical pixels, so
  // seven cells at 100/7% overflow the row and the last one wraps — the month
  // renders six days wide with the weekday header out of step. Rows of seven
  // flex:1 cells divide exactly on every platform. The final week is padded
  // so its cells keep the same width as the rest.
  const weeks = useMemo(() => {
    const out = [];
    for (let index = 0; index < cells.length; index += 7) {
      const week = cells.slice(index, index + 7);
      while (week.length < 7) {
        week.push({ blank: true, key: `pad-${index}-${week.length}` });
      }
      out.push(week);
    }
    return out;
  }, [cells]);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - 7);
  earliest.setHours(0, 0, 0, 0);

  const editable = (cell) => !cell.blank && cell.date <= todayEnd && cell.date >= earliest;

  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.title}>Saving calendar</Text>
        <Text style={styles.subtitle}>Tap to view · long press a recent day to edit</Text>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          onPress={onPreviousMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
        >
          <Text style={styles.navText}>‹</Text>
        </Pressable>

        <Text style={styles.monthLabel}>
          {monthStart.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
        </Text>

        <Pressable
          onPress={onNextMonth}
          disabled={!canViewNextMonth}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: !canViewNextMonth }}
          style={({ pressed }) => [
            styles.navBtn,
            !canViewNextMonth && styles.navDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={index} style={styles.weekdayText}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View style={styles.week} key={`week-${weekIndex}`} testID="saving-calendar-week">
          {week.map((cell) => {
          if (cell.blank) return <View key={cell.key} style={styles.cell} />;

          const future = cell.date > todayEnd;
          const total = cell.entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

          return (
            <Pressable
              key={cell.key}
              onPress={() => onViewDay(cell.key)}
              onLongPress={() => editable(cell) && onEditDay(cell.key)}
              accessibilityRole="button"
              accessibilityLabel={`${cell.date.getDate()}${
                cell.entries.length ? `, $${total.toFixed(0)} saved` : ""
              }`}
              accessibilityHint={editable(cell) ? "Long press to edit" : undefined}
              style={({ pressed }) => [
                styles.cell,
                styles.cellFilled,
                future ? styles.cellFuture : styles.cellPast,
                pressed && styles.pressed,
              ]}
            >
              {cell.entries.length ? (
                <View style={styles.stripe}>
                  {cell.entries.map((entry, index) => (
                    <View
                      key={index}
                      style={[
                        styles.stripeSegment,
                        { backgroundColor: planMap[entry.planId]?.color || "#aaa" },
                      ]}
                    />
                  ))}
                </View>
              ) : null}

              <Text style={styles.dayText}>{cell.date.getDate()}</Text>
              {cell.entries.length ? (
                <Text style={styles.amountText} numberOfLines={1}>
                  ${total.toFixed(0)}
                </Text>
              ) : null}
            </Pressable>
          );
          })}
        </View>
      ))}

      <PrimaryButton
        label={hasActivePlans ? "+ Add saving plan" : "Create a saving plan"}
        onPress={onAddPlan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  pressed: { opacity: 0.7 },

  title: { ...type.title, fontFamily: fonts.bold, color: colors.text },
  subtitle: { ...type.caption, color: colors.textMuted },

  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.rowTint,
  },
  navDisabled: { opacity: 0.35 },
  navText: { ...type.h3, color: colors.text },
  monthLabel: { ...type.title, fontFamily: fonts.semibold, color: colors.text },

  weekdays: { flexDirection: "row" },
  weekdayText: {
    ...type.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: "center",
  },

  week: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cellFilled: { borderRadius: radius.sm, overflow: "hidden" },
  cellFuture: { backgroundColor: colors.card },
  cellPast: { backgroundColor: colors.rowTint },

  stripe: { position: "absolute", top: 0, left: 0, right: 0, height: 4, flexDirection: "row" },
  stripeSegment: { flex: 1 },

  dayText: { ...type.small, color: colors.text },
  amountText: { ...type.caption, fontFamily: fonts.semibold, color: colors.textMuted },
});
