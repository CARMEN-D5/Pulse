const mockOpenSharePrompt = jest.fn();
let mockSnapshotTodos = [];

jest.mock('../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(),
    collection: jest.fn((_db, ...parts) => parts.join('/')),
    deleteDoc: jest.fn(),
    doc: jest.fn((_db, ...parts) => parts.join('/')),
    onSnapshot: jest.fn(),
    orderBy: jest.fn((...parts) => parts),
    query: jest.fn((value) => value),
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    updateDoc: jest.fn(),
}));

jest.mock('../firestore/scoring', () => ({ logAction: jest.fn() }));
jest.mock('../firestore/social', () => ({ todayKey: jest.fn(() => '2026-09-30') }));
jest.mock('../utils/dialogs', () => ({ confirm: jest.fn() }));

jest.mock('../components/share', () => ({
    ShareButton: () => null,
    useSharePrompt: () => ({ openSharePrompt: mockOpenSharePrompt }),
}));

jest.mock('../tutorial', () => {
    const React = require('react');
    const { ScrollView } = require('react-native');
    return {
        TUTORIAL_TARGETS: {
            todo: { form: 'todo.form', filters: 'todo.filters', list: 'todo.list' },
        },
        TutorialScrollView: React.forwardRef((props, ref) => (
            <ScrollView ref={ref} {...props} />
        )),
        TutorialTarget: ({ children }) => children,
        useTutorial: jest.fn(),
    };
});

jest.mock('../components/DateField', () => () => null);
jest.mock('../components/Dropdown', () => () => null);
jest.mock('../components/SegmentedField', () => () => null);

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import TodoList from './TodoList';
import { confirm } from '../utils/dialogs';

const TODO = {
    id: 'todo-1',
    text: 'Buy milk',
    description: 'Two litres',
    completed: false,
    dueDate: '9999-12-31',
    priority: 'Medium',
    createdAt: { toMillis: () => 1 },
};

function renderTodoList() {
    return render(
        <TodoList
            user={{ uid: 'user-1' }}
            onBack={jest.fn()}
            onActivityLogged={jest.fn()}
        />
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshotTodos = [{ ...TODO }];
    confirm.mockResolvedValue(true);
    onSnapshot.mockImplementation((_query, callback) => {
        callback({
            docs: mockSnapshotTodos.map(({ id, ...data }) => ({
                id,
                data: () => data,
            })),
        });
        return jest.fn();
    });
});

test('visible delete action uses the shared confirmation flow before deleting', async () => {
    renderTodoList();

    fireEvent.press(await screen.findByLabelText('Delete Buy milk'));

    await waitFor(() => expect(confirm).toHaveBeenCalledWith(
        '"Buy milk" will be removed permanently.',
        {
            title: 'Delete task?',
            confirmLabel: 'Delete',
            destructive: true,
        }
    ));
    expect(deleteDoc).toHaveBeenCalledWith('users/user-1/todos/todo-1');
});

test('cancelling visible delete confirmation keeps the task', async () => {
    confirm.mockResolvedValue(false);
    renderTodoList();

    fireEvent.press(await screen.findByLabelText('Delete Buy milk'));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(deleteDoc).not.toHaveBeenCalled();
    expect(screen.getByText('Buy milk')).toBeOnTheScreen();
});

test('long press deletion still uses the same confirmed delete flow', async () => {
    renderTodoList();

    fireEvent(await screen.findByLabelText('Edit Buy milk'), 'longPress');

    await waitFor(() => expect(deleteDoc).toHaveBeenCalledWith('users/user-1/todos/todo-1'));
    expect(confirm).toHaveBeenCalledTimes(1);
});

test('an edited task cannot be saved with an empty or whitespace-only title', async () => {
    renderTodoList();

    fireEvent.press(await screen.findByLabelText('Edit Buy milk'));
    const titleInput = screen.getByLabelText('Task title');
    fireEvent.changeText(titleInput, '   ');
    fireEvent(titleInput, 'submitEditing');

    expect(await screen.findByText(/task title cannot be empty/i)).toBeOnTheScreen();
    expect(updateDoc).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Task title')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Done' }).props.accessibilityState)
        .toMatchObject({ disabled: true });
});

test('checkbox completion behaviour remains unchanged', async () => {
    renderTodoList();

    fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
        'users/user-1/todos/todo-1',
        { completed: true }
    ));
});
