import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import PhysicalActivity, { formatStrengthSet, getActivityValidation } from './PhysicalActivity';
import { confirm } from '../utils/dialogs';
import { addDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../firestore/scoring', () => ({ logAction: jest.fn() }));
jest.mock('../components/Icon', () => () => null);
jest.mock('../components/share', () => ({
    ShareButton: () => null,
    useSharePrompt: () => ({ openSharePrompt: jest.fn() }),
}));
jest.mock('../tutorial', () => ({
    TUTORIAL_TARGETS: { activity: { pages: 'activity.pages', form: 'activity.form', submit: 'activity.submit' } },
    TutorialTarget: ({ children }) => children,
    TutorialScrollView: require('react-native').ScrollView,
    useTutorial: jest.fn(),
}));
jest.mock('../utils/dialogs', () => ({ confirm: jest.fn() }));
jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(async () => ({ id: 'new-activity' })),
    collection: jest.fn((...parts) => parts.join('/')),
    deleteDoc: jest.fn(async () => {}),
    doc: jest.fn((...parts) => parts.join('/')),
    onSnapshot: jest.fn(),
    orderBy: jest.fn(),
    query: jest.fn(value => value),
    serverTimestamp: jest.fn(() => 'server-time'),
    updateDoc: jest.fn(async () => {}),
}));

const user = { uid: 'user-1' };
let snapshotNext;

function renderScreen(records = []) {
    onSnapshot.mockImplementation((_query, onNext) => {
        snapshotNext = onNext;
        return jest.fn();
    });
    const screen = render(<PhysicalActivity user={user} onBack={jest.fn()} />);
    act(() => {
        snapshotNext({
            docs: records.map(record => ({ id: record.id, data: () => record })),
        });
    });
    return screen;
}

const cardio = {
    id: 'cardio-1',
    text: 'Morning run',
    description: '',
    type: 'cardio',
    distance: '5',
    duration: '30',
    exercises: [],
    activityDate: '2026-10-01',
};

const strength = {
    id: 'strength-1',
    text: 'Leg day',
    description: '',
    type: 'strength',
    distance: 0,
    duration: 0,
    activityDate: '2026-10-01',
    exercises: [
        { name: 'Squat', sets: [{ setCount: '3', weight: '15', reps: '12' }] },
        { name: 'Lunge', sets: [{ setCount: '2', weight: '10', reps: '8' }] },
    ],
};

beforeEach(() => {
    jest.clearAllMocks();
    confirm.mockResolvedValue(true);
});

describe('Physical Activity form', () => {
    test('shows a coloured required indicator, persistent cardio labels, and today by default', () => {
        const { getAllByText, getByText } = renderScreen();
        expect(getAllByText('*')[0]).toHaveStyle({ color: '#C94040' });
        expect(getByText(/Distance \(km\)/)).toBeTruthy();
        expect(getByText(/Duration \(min\)/)).toBeTruthy();

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        expect(getByText(today)).toBeTruthy();
    });

    test('keeps Add disabled until all required cardio fields are valid', () => {
        const { getByLabelText, getByRole } = renderScreen();
        expect(getByRole('button', { name: 'Add' })).toBeDisabled();

        fireEvent.changeText(getByLabelText('Activity Name'), 'Run');
        fireEvent.changeText(getByLabelText('Distance (km)'), '5');
        fireEvent.changeText(getByLabelText('Duration (min)'), '30');
        expect(getByRole('button', { name: 'Add' })).toBeEnabled();
    });

    test('validates, stores, and renders Number of Sets for strength activities', async () => {
        const { getByLabelText, getByRole, getByText, queryByText } = renderScreen();
        fireEvent.press(getByLabelText('Strength'));
        expect(queryByText(/sets and reps must be whole numbers/)).toBeNull();
        expect(getByRole('button', { name: 'Add' })).toBeDisabled();
        fireEvent.changeText(getByLabelText('Activity Name'), 'Weights');
        fireEvent.changeText(getByLabelText('Exercise 1 name'), 'Bench press');
        fireEvent.changeText(getByLabelText('Number of Sets 1.1'), '0');
        fireEvent.changeText(getByLabelText('Weight (kg) 1.1'), '15');
        fireEvent.changeText(getByLabelText('Reps 1.1'), '12');

        expect(getByRole('button', { name: 'Add' })).toBeDisabled();
        expect(getByText(/sets and reps must be whole numbers/)).toBeTruthy();

        fireEvent.changeText(getByLabelText('Number of Sets 1.1'), '3');
        fireEvent.press(getByRole('button', { name: 'Add' }));

        await waitFor(() => expect(addDoc).toHaveBeenCalled());
        expect(addDoc.mock.calls[0][1]).toMatchObject({
            text: 'Weights',
            type: 'strength',
            exercises: [{
                name: 'Bench press',
                sets: [{ setCount: '3', weight: '15', reps: '12' }],
            }],
        });
        expect(formatStrengthSet({ setCount: '3', weight: '15', reps: '12' }))
            .toBe('3 sets × 15 kg × 12 reps');
    });

    test('edit Done is disabled and feedback stays beside an invalid field', () => {
        const { getByLabelText, getByRole, getByText, queryByLabelText } = renderScreen([cardio]);
        fireEvent.press(getByText('Morning run'));
        expect(queryByLabelText('Delete activity Morning run')).toBeNull();
        fireEvent.changeText(getByLabelText('Edit Activity Name'), '   ');

        expect(getByText('Activity name is required.')).toBeTruthy();
        expect(getByRole('button', { name: 'Done' })).toBeDisabled();
        expect(updateDoc).not.toHaveBeenCalled();
    });

    test('Add Exercise can be removed in Create without changing the remaining exercise', () => {
        const { getByLabelText, getByText, queryByLabelText } = renderScreen();
        fireEvent.press(getByLabelText('Strength'));
        fireEvent.changeText(getByLabelText('Exercise 1 name'), 'Squat');
        fireEvent.press(getByText('+ Add Exercise'));
        fireEvent.changeText(getByLabelText('Exercise 2 name'), 'Bench');

        fireEvent.press(getByLabelText('Remove exercise Bench'));

        expect(getByLabelText('Exercise 1 name').props.value).toBe('Squat');
        expect(queryByLabelText('Exercise 2 name')).toBeNull();
        expect(queryByLabelText('Remove exercise Squat')).toBeNull();
    });

    test('removes a selected existing exercise in Edit and preserves it after save and reopen', async () => {
        const { getByLabelText, getByRole, getByText, queryByLabelText } = renderScreen([strength]);
        fireEvent.press(getByText('Leg day'));
        fireEvent.press(getByLabelText('Remove exercise Lunge'));

        expect(getByLabelText('Edit exercise 1 name').props.value).toBe('Squat');
        expect(queryByLabelText('Edit exercise 2 name')).toBeNull();
        fireEvent.press(getByRole('button', { name: 'Done' }));

        await waitFor(() => expect(updateDoc).toHaveBeenCalled());
        const saved = updateDoc.mock.calls[0][1];
        expect(saved.exercises).toEqual([
            { name: 'Squat', sets: [{ setCount: '3', weight: '15', reps: '12' }] },
        ]);

        act(() => {
            snapshotNext({ docs: [{ id: strength.id, data: () => ({ ...strength, ...saved }) }] });
        });
        fireEvent.press(getByText('Leg day'));
        expect(getByLabelText('Edit exercise 1 name').props.value).toBe('Squat');
        expect(queryByLabelText('Edit exercise 2 name')).toBeNull();
    });

    test('Edit Add Set preserves independent setCount configurations after save and reopen', async () => {
        const oneExercise = { ...strength, exercises: [strength.exercises[0]] };
        const { getByLabelText, getByRole, getByText } = renderScreen([oneExercise]);
        fireEvent.press(getByText('Leg day'));
        fireEvent.press(getByText('+ Add Set'));

        expect(getByLabelText('Edit Number of Sets 1.1').props.value).toBe('3');
        fireEvent.changeText(getByLabelText('Edit Number of Sets 1.2'), '1');
        fireEvent.changeText(getByLabelText('Edit Weight (kg) 1.2'), '20');
        fireEvent.changeText(getByLabelText('Edit Reps 1.2'), '8');
        fireEvent.press(getByRole('button', { name: 'Done' }));

        await waitFor(() => expect(updateDoc).toHaveBeenCalled());
        const saved = updateDoc.mock.calls[0][1];
        expect(saved.exercises[0].sets).toEqual([
            { setCount: '3', weight: '15', reps: '12' },
            { setCount: '1', weight: '20', reps: '8' },
        ]);

        act(() => {
            snapshotNext({ docs: [{ id: strength.id, data: () => ({ ...oneExercise, ...saved }) }] });
        });
        fireEvent.press(getByText('Leg day'));
        expect(getByLabelText('Edit Number of Sets 1.2').props.value).toBe('1');
        expect(getByLabelText('Edit Weight (kg) 1.2').props.value).toBe('20');
        expect(getByLabelText('Edit Reps 1.2').props.value).toBe('8');
    });

    test('Edit Remove Set affects only the selected exercise and keeps one row minimum', () => {
        const twoSetsEach = {
            ...strength,
            exercises: strength.exercises.map(exercise => ({
                ...exercise,
                sets: [
                    ...exercise.sets,
                    { setCount: '1', weight: '20', reps: '6' },
                ],
            })),
        };
        const { getAllByText, getByLabelText, getByText, queryByLabelText, queryAllByText } = renderScreen([twoSetsEach]);
        fireEvent.press(getByText('Leg day'));
        fireEvent.press(getAllByText('- Remove Set')[1]);

        expect(getByLabelText('Edit Number of Sets 1.2').props.value).toBe('1');
        expect(queryByLabelText('Edit Number of Sets 2.2')).toBeNull();
        expect(getByLabelText('Edit Number of Sets 2.1').props.value).toBe('2');

        fireEvent.press(queryAllByText('- Remove Set')[0]);
        expect(queryByLabelText('Edit Number of Sets 1.2')).toBeNull();
        expect(queryAllByText('- Remove Set')).toHaveLength(0);
        expect(getByLabelText('Edit Number of Sets 1.1')).toBeTruthy();
        expect(getByLabelText('Edit Number of Sets 2.1')).toBeTruthy();
    });
});

describe('Physical Activity records', () => {
    test('renders new and legacy strength summaries safely', () => {
        const strengthRecords = [
            {
                id: 'strength-new', text: 'Bench day', type: 'strength', activityDate: '2026-10-01',
                exercises: [{ name: 'Bench', sets: [{ setCount: '3', weight: '15', reps: '12' }] }],
            },
            {
                id: 'strength-legacy', text: 'Legacy lift', type: 'strength', activityDate: '2026-09-30',
                exercises: [{ name: 'Squat', sets: [{ weight: '40', reps: '8' }] }],
            },
        ];
        const { getByText } = renderScreen(strengthRecords);
        expect(getByText('3 sets × 15 kg × 12 reps')).toBeTruthy();
        expect(getByText('1 set × 40 kg × 8 reps')).toBeTruthy();
    });

    test('visible delete icon and long press reuse the confirmation deletion flow', async () => {
        const { getByLabelText, getByText } = renderScreen([cardio]);

        fireEvent.press(getByLabelText('Delete activity Morning run'));
        await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(1));
        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Morning run'), expect.any(Object));

        fireEvent(getByText('Morning run'), 'longPress');
        await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(2));
        expect(confirm).toHaveBeenCalledTimes(2);
    });
});

describe('Physical Activity validation helpers', () => {
    test('requires a positive whole Number of Sets', () => {
        const base = {
            text: 'Weights', activityDate: '2026-10-01', type: 'strength', distance: '', duration: '',
        };
        expect(getActivityValidation({
            ...base,
            exercises: [{ name: 'Bench', sets: [{ setCount: '1.5', weight: '15', reps: '12' }] }],
        })).toHaveProperty('strength');
        expect(getActivityValidation({
            ...base,
            exercises: [{ name: 'Bench', sets: [{ setCount: '3', weight: '15', reps: '12' }] }],
        })).toEqual({});
    });
});
