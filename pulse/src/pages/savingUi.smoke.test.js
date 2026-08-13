// Render smoke tests for the saving-plan UI.
//
// These components were ported from the web build (div/className/CSS) to
// React Native during the main -> ScoreSystem merge. The logic they sit on is
// covered by savingMilestones.test.js; what is worth pinning here is simply
// that each one mounts under the native renderer, which is exactly what the
// web versions could not do.
jest.mock('../firebase', () => ({ app: {}, auth: {}, db: {}, storage: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(),
  addDoc: jest.fn(), deleteDoc: jest.fn(), collection: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })), onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(),
  serverTimestamp: jest.fn(), increment: jest.fn(), writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

jest.mock('../firestore/savings', () => ({
  localDayKey: jest.fn(() => '2026-08-13'),
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
  monthBounds: jest.fn(() => ({ monthStart: new Date(2026, 7, 1), monthEnd: new Date(2026, 8, 1) })),
  daysInMonth: jest.fn(() => 31),
  listExpenses: jest.fn(async () => ({ ok: true, data: [] })),
}));

import React from 'react';
import { render } from '@testing-library/react-native';

import SavingPlanCard from './SavingPlanCard';
import SavingCalendar from './SavingCalendar';
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
    const { getByText } = render(
      <SavingPlanCard plan={PLAN} savedAmount={1000} onEdit={noop} />
    );
    expect(getByText('Japan trip')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
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

  it('SavingView with no plans', () => {
    const { getAllByText, getByText } = render(
      <SavingView uid="u1" totalBudget={1000} onError={noop} />
    );
    // Empty-state heading plus the calendar's own call to action.
    expect(getAllByText('Create a saving plan').length).toBeGreaterThan(0);
    expect(getByText('History')).toBeTruthy();
  });
});
