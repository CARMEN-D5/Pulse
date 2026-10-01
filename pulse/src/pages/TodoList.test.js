const mockOpenSharePrompt = jest.fn();
let mockSnapshotTodos = [];
let mockSnapshotCallback;

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
jest.mock('../components/Dropdown', () => {
    const React = require('react');
    const { Pressable, Text, View } = require('react-native');
    return function MockDropdown({ label, options, onChange }) {
        return (
            <View>
                {options.map((option) => (
                    <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityLabel={`${label}: ${option.value}`}
                        onPress={() => onChange(option.value)}
                    >
                        <Text>{option.label}</Text>
                    </Pressable>
                ))}
            </View>
        );
    };
});
jest.mock('../components/SegmentedField', () => () => null);

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { addDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import TodoList from './TodoList';
import { logAction } from '../firestore/scoring';
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

function snapshotFor(todos) {
    return {
        docs: todos.map(({ id, ...data }) => ({ id, data: () => data })),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshotTodos = [{ ...TODO }];
    confirm.mockResolvedValue(true);
    logAction.mockResolvedValue({ ok: true });
    onSnapshot.mockImplementation((_query, callback) => {
        mockSnapshotCallback = callback;
        callback(snapshotFor(mockSnapshotTodos));
        return jest.fn();
    });
});

test('trims leading and trailing whitespace when creating a task', async () => {
    renderTodoList();

    fireEvent.changeText(screen.getByLabelText('New task title'), '   Buy milk   ');
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc.mock.calls[0][1]).toMatchObject({ text: 'Buy milk' });
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

test('trims leading and trailing whitespace when editing a task', async () => {
    renderTodoList();

    fireEvent.press(await screen.findByLabelText('Edit Buy milk'));
    fireEvent.changeText(screen.getByLabelText('Task title'), '   Buy oat milk   ');
    fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
        'users/user-1/todos/todo-1',
        expect.objectContaining({ text: 'Buy oat milk' })
    ));
});

test('checkbox completion behaviour remains unchanged', async () => {
    renderTodoList();

    fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
        'users/user-1/todos/todo-1',
        { completed: true }
    ));
});

test('complete, uncomplete and complete again awards Productivity only once', async () => {
    renderTodoList();
    fireEvent.press(screen.getByLabelText('Show: all'));

    fireEvent.press(await screen.findByRole('checkbox', { name: 'Buy milk' }));
    await waitFor(() => expect(logAction).toHaveBeenCalledTimes(1));
    expect(logAction).toHaveBeenCalledWith(
        'user-1',
        'productivity',
        'task',
        { eventId: 'todo-todo-1' }
    );

    act(() => {
        mockSnapshotCallback(snapshotFor([{ ...TODO, completed: true, productivityRewarded: true }]));
    });
    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
        'users/user-1/todos/todo-1',
        { completed: false }
    ));

    act(() => {
        mockSnapshotCallback(snapshotFor([{ ...TODO, completed: false, productivityRewarded: true }]));
    });
    fireEvent.press(screen.getByRole('checkbox', { name: 'Buy milk' }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(
        'users/user-1/todos/todo-1',
        { completed: true }
    ));

    expect(logAction).toHaveBeenCalledTimes(1);
});

test('stops loading after a Firestore error and retries without exposing raw details', async () => {
    onSnapshot
        .mockImplementationOnce((_query, _success, failure) => {
            failure({ code: 'permission-denied', message: 'raw firestore details' });
            return jest.fn();
        })
        .mockImplementationOnce((_query, success) => {
            mockSnapshotCallback = success;
            success(snapshotFor(mockSnapshotTodos));
            return jest.fn();
        });

    renderTodoList();

    expect(
        await screen.findByText(/couldn't load your tasks/i)
    ).toBeOnTheScreen();
    expect(screen.queryByText(/raw firestore details/i)).toBeNull();
    expect(screen.queryByText('Loading…')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(onSnapshot).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Buy milk')).toBeOnTheScreen();
});
