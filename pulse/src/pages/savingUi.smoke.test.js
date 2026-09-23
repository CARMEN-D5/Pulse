// Render smoke tests for the saving-plan UI.
//
// These components were ported from the web build (div/className/CSS) to
// React Native during the main -> ScoreSystem merge. The logic they sit on is
// covered by savingMilestones.test.js; what is worth pinning here is simply
// that each one mounts under the native renderer, which is exactly what the
// web versions could not do.
jest.mock('../firebase', () => ({ app: {}, auth: {}, db: {}, storage: {} }));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn(),
}));
jest.mock('../components/share', () => ({
  ShareButton: () => null,
  useSharePrompt: () => ({ openSharePrompt: jest.fn() }),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(),
  addDoc: jest.fn(), deleteDoc: jest.fn(), collection: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })), onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(),
  serverTimestamp: jest.fn(), increment: jest.fn(), writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

jest.mock('../firestore/savings', () => ({
  // Must derive a real per-date key: the calendar uses it as each cell's React
  // key and to look up that day's entries, so a constant would collapse every
  // cell onto one key and hide the entry-rendering path entirely.
  localDayKey: jest.fn((value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }),
  listSavingPlans: jest.fn(async () => ({ ok: true, data: [] })),
  listSavingEntries: jest.fn(async () => ({ ok: true, data: [] })),
  getSavingTotalsByPlan: jest.fn(async () => ({ ok: true, data: {} })),
  getDailySavingPrompt: jest.fn(async () => ({ ok: true, data: { lastCheckedDate: '2026-08-13' } })),
  markDailySavingPromptChecked: jest.fn(async () => ({ ok: true })),
  addSavingEntry: jest.fn(async () => ({ ok: true })),
  replaceSavingEntriesForDay: jest.fn(async () => ({ ok: true })),
  saveSavingPlan: jest.fn(async () => ({ ok: true })),
  deleteSavingPlan: jest.fn(async () => ({ ok: true })),
  restoreSavingPlan: jest.fn(async () => ({ ok: true })),
  completeSavingPlan: jest.fn(async () => ({ ok: true })),
}));

jest.mock('../firestore/finance', () => ({
  dayKey: jest.fn((value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }),
  monthBounds: jest.fn(() => ({ monthStart: new Date(2026, 7, 1), monthEnd: new Date(2026, 8, 1) })),
  daysInMonth: jest.fn(() => 31),
  listExpenses: jest.fn(async () => ({ ok: true, data: [] })),
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import SavingPlanCard, { getSavingPlanDisplay } from './SavingPlanCard';
import SavingPlanIcon, { isSafeCustomSavingIcon } from './SavingPlanIcon';
import SavingCalendar, { SAVING_EDIT_LIMIT_MESSAGE } from './SavingCalendar';
import SpendingCalendar from './SpendingCalendar';
import SavingPlanModal from './SavingPlanModal';
import SavingEntryModal from './SavingEntryModal';
import SavingDetailsModal from './SavingDetailsModal';
import SavingMilestoneModal from './SavingMilestoneModal';
import CompletedPlansHistory from './CompletedPlansHistory';
import SavingView from './SavingView';

const PLAN = {
  id: 'plan-1',
  name: 'Japan trip',
  icon: '✈️',
  color: '#4d96ff',
  targetAmount: 4000,
  dueDate: '2026-12-01',
  status: 'active',
  createdAt: new Date(2026, 0, 1),
};

const ENTRY = { id: 'e1', planId: 'plan-1', dayKey: '2026-08-12', amount: 25, source: 'manual' };

const noop = () => {};

describe('saving UI renders under React Native', () => {
  it('SavingPlanCard', () => {
    const onEdit = jest.fn();
    const { getByLabelText, getByText, queryByText } = render(
      <SavingPlanCard plan={PLAN} savedAmount={1000} onEdit={onEdit} />
    );
    expect(getByText('Japan trip')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
    expect(queryByText('1 Jan 2026 – 1 Dec 2026')).toBeNull();
    fireEvent.press(getByLabelText('Japan trip saving plan. Tap to edit.'));
    expect(onEdit).toHaveBeenCalledWith(PLAN);
  });

  it('calculates plan timing for active and expired rows without changing stored data', () => {
    const active = getSavingPlanDisplay(PLAN, 1000, new Date(2026, 10, 1, 12));
    expect(active.rawDays).toBeGreaterThan(0);
    expect(active.dailyNeeded).toBeCloseTo(active.remaining / active.rawDays);

    const expired = getSavingPlanDisplay(PLAN, 1000, new Date(2026, 11, 5, 12));
    expect(expired.expiredDays).toBeGreaterThan(0);
    expect(expired.dailyNeeded).toBeNull();
  });

  it('shows only a red expired message after the saved/remaining row', () => {
    const { getByText, queryByText } = render(
      <SavingPlanCard
        plan={{ ...PLAN, dueDate: '2020-01-01' }}
        savedAmount={1000}
        onEdit={noop}
      />
    );
    expect(getByText(/Expired \d+ days ago/)).toHaveStyle({ color: '#C94040' });
    expect(queryByText(/day needed/)).toBeNull();
    expect(queryByText(/days left/)).toBeNull();
  });

  it('uses a safe fallback for invalid saving plan icons', () => {
    expect(isSafeCustomSavingIcon('\uFFFD')).toBe(false);
    const { toJSON } = render(<SavingPlanIcon value="\uFFFD" />);
    expect(JSON.stringify(toJSON())).not.toContain('\uFFFD');
  });

  it('SavingCalendar', () => {
    const { getByText } = render(
      <SavingCalendar
        monthStart={new Date(2026, 7, 1)}
        entries={[ENTRY]}
        plans={[PLAN]}
        hasActivePlans
        canViewNextMonth={false}
        onPreviousMonth={noop}
        onNextMonth={noop}
        onViewDay={noop}
        onEditDay={noop}
        onAddPlan={noop}
      />
    );
    expect(getByText('Saving calendar')).toBeTruthy();
    expect(getByText('August 2026')).toBeTruthy();
  });

  // Regression: the month used to render six days wide on Android. Seven
  // cells at width 100/7% overflowed the wrapped row once each was rounded up
  // to whole physical pixels, so the last column wrapped onto the next line.
  it('SavingCalendar lays out full seven-day weeks', () => {
    const { getAllByTestId, getByText } = render(
      <SavingCalendar
        monthStart={new Date(2026, 7, 1)}
        entries={[ENTRY]}
        plans={[PLAN]}
        hasActivePlans
        canViewNextMonth={false}
        onPreviousMonth={noop}
        onNextMonth={noop}
        onViewDay={noop}
        onEditDay={noop}
        onAddPlan={noop}
      />
    );

    // 1 Aug 2026 is a Saturday: 6 leading blanks + 31 days = 37 cells = 6 rows.
    const weeks = getAllByTestId('saving-calendar-week');
    expect(weeks).toHaveLength(6);
    for (const week of weeks) {
      expect(week.children).toHaveLength(7);
    }

    // Every day of the month is reachable, including the last.
    for (const day of [1, 15, 31]) {
      expect(getByText(String(day))).toBeTruthy();
    }

    // The 12 Aug entry lands on its own cell and shows that day's total.
    expect(getByText('$25')).toBeTruthy();
  });

  it('SavingPlanModal', () => {
    const { getByText } = render(
      <SavingPlanModal plan={PLAN} onClose={noop} onSave={noop} />
    );
    expect(getByText('Edit saving plan')).toBeTruthy();
  });

  it('SavingEntryModal', () => {
    const { getByText } = render(
      <SavingEntryModal
        dayKey="2026-08-12"
        plans={[PLAN]}
        entries={[ENTRY]}
        onClose={noop}
        onSave={noop}
        onCreatePlan={noop}
      />
    );
    expect(getByText('Add saving record')).toBeTruthy();
  });

  it('SavingEntryModal with no active plans', () => {
    const { getByText } = render(
      <SavingEntryModal
        dayKey="2026-08-12"
        plans={[]}
        entries={[]}
        onClose={noop}
        onSave={noop}
        onCreatePlan={noop}
      />
    );
    expect(getByText('No active saving plan')).toBeTruthy();
  });

  it('SavingDetailsModal', () => {
    const { getAllByText, getByText } = render(
      <SavingDetailsModal dayKey="2026-08-12" plans={[PLAN]} entries={[ENTRY]} onClose={noop} />
    );
    expect(getByText('Saving details')).toBeTruthy();
    // The row amount and the total both read $25.00 for a single entry.
    expect(getAllByText('$25.00')).toHaveLength(2);
  });

  it('SavingMilestoneModal (milestone)', () => {
    const { getByText } = render(
      <SavingMilestoneModal
        event={{ type: 'milestone', milestone: 50, actualProgress: 52, planName: 'Japan trip' }}
        onClose={noop}
        onComplete={noop}
      />
    );
    expect(getByText('Amazing work!')).toBeTruthy();
  });

  it('SavingMilestoneModal (completed)', () => {
    const { getByText } = render(
      <SavingMilestoneModal
        event={{ type: 'completed', planName: 'Japan trip', savedAmount: 4000, targetAmount: 4000 }}
        onClose={noop}
        onComplete={noop}
      />
    );
    expect(getByText('Goal completed!')).toBeTruthy();
  });

  it('CompletedPlansHistory', () => {
    const { getByText } = render(
      <CompletedPlansHistory
        plans={[{ ...PLAN, status: 'completed' }]}
        savedByPlan={{ 'plan-1': 4000 }}
        onEdit={noop}
        onRestore={noop}
        onDelete={noop}
      />
    );
    expect(getByText('History')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
  });

  it('SavingView with no plans', async () => {
    const { getAllByText, getByText } = render(
      <SavingView uid="u1" totalBudget={1000} onError={noop} />
    );
    // Its two loaders resolve after mount; flush them so the state settles
    // inside act() rather than warning.
    await act(async () => {});
    // Empty-state heading plus the calendar's own call to action.
    expect(getAllByText('Create a saving plan').length).toBeGreaterThan(0);
    expect(getByText('History')).toBeTruthy();
  });

  it('SavingCalendar explains the edit limit for old and future dates', () => {
    const onInvalidEdit = jest.fn();
    const onEditDay = jest.fn();
    const onViewDay = jest.fn();
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const common = {
      entries: [], plans: [], hasActivePlans: false, canViewNextMonth: false,
      onPreviousMonth: noop, onNextMonth: noop, onViewDay, onEditDay,
      onInvalidEdit, onAddPlan: noop,
    };

    const previous = render(<SavingCalendar {...common} monthStart={previousMonth} />);
    fireEvent(previous.getByLabelText('1'), 'longPress');
    fireEvent.press(previous.getByLabelText('1'));
    previous.unmount();

    const future = render(<SavingCalendar {...common} monthStart={nextMonth} />);
    fireEvent(future.getByLabelText('1'), 'longPress');

    expect(onInvalidEdit).toHaveBeenNthCalledWith(1, SAVING_EDIT_LIMIT_MESSAGE);
    expect(onInvalidEdit).toHaveBeenNthCalledWith(2, SAVING_EDIT_LIMIT_MESSAGE);
    expect(onEditDay).not.toHaveBeenCalled();
    expect(onViewDay).toHaveBeenCalledTimes(1);
  });

  it('SpendingCalendar owns month navigation and the add expense action', () => {
    const onPreviousMonth = jest.fn();
    const onNextMonth = jest.fn();
    const onAddExpense = jest.fn();
    const { getByLabelText, getByText } = render(
      <SpendingCalendar
        expenses={[]}
        monthStart={new Date(2026, 7, 1)}
        monthLabel="August 2026"
        dailyAllowance={58.33}
        canViewNextMonth
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onJumpToCurrentMonth={noop}
        onAddExpense={onAddExpense}
      />
    );

    expect(getByText('Allowance: $58.33 / day')).toBeTruthy();
    fireEvent.press(getByLabelText('Previous month'));
    fireEvent.press(getByLabelText('Next month'));
    fireEvent.press(getByText('＋  Add an expense'));
    expect(onPreviousMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
    expect(onAddExpense).toHaveBeenCalledTimes(1);
  });

  it('SavingView keeps active plans in one vertical scroll area', async () => {
    const { listSavingPlans, getSavingTotalsByPlan } = require('../firestore/savings');
    const plans = [
      PLAN,
      { ...PLAN, id: 'plan-2', name: 'Emergency fund', icon: '💰' },
      { ...PLAN, id: 'plan-3', name: 'New laptop', icon: '💻' },
    ];
    listSavingPlans.mockResolvedValueOnce({ ok: true, data: plans });
    getSavingTotalsByPlan.mockResolvedValueOnce({
      ok: true,
      data: { 'plan-1': 1000, 'plan-2': 500, 'plan-3': 250 },
    });

    const { getByTestId, getByText } = render(
      <SavingView uid="u1" totalBudget={1000} onError={noop} />
    );
    await act(async () => {});

    expect(getByTestId('active-saving-plans-scroll')).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('active-saving-plans-card').props.style).height)
      .toBeLessThanOrEqual(250);
    expect(getByText('Active saving plans')).toBeTruthy();
    expect(getByText('Emergency fund')).toBeTruthy();
    expect(getByText('New laptop')).toBeTruthy();
  });
});
