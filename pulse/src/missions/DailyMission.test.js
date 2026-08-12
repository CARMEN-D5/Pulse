/**
 * Component tests for DailyMissions.js.
 * All Firebase and missionEngine Firestore calls are mocked — runs offline.
 *
 * Place at: src/missions/DailyMissions.test.js
 * Run with: npm test
 */

// ─── Mock Firebase before any imports ────────────────────────────────────────
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    doc:        jest.fn(),
    getDoc:     jest.fn(),
    setDoc:     jest.fn(),
    collection: jest.fn(),
    getDocs:    jest.fn(),
    orderBy:    jest.fn(),
    query:      jest.fn(q => q),
}));

// ─── Mock missionEngine (Firestore layer only) ────────────────────────────────
// Pure logic functions use real implementations so logic bugs still surface.
// Only the Firestore helpers are replaced with mocks.
jest.mock('./missionEngine', () => {
    const real = jest.requireActual('./missionEngine');
    return {
        ...real,
        loadDailyDoc: jest.fn(),
        saveDailyDoc: jest.fn().mockResolvedValue(undefined),
        archiveDay:   jest.fn().mockResolvedValue(undefined),
        loadHistory:  jest.fn().mockResolvedValue([]),
        // Pin date helpers so tests are deterministic
        getDayKey:  () => '2025-05-15',
        getWeekKey: () => '2025-W20',
    };
});

// ─── Mock MissionHistory (child component) ────────────────────────────────────
jest.mock('./MissionHistory', () => {
    const { Text } = require('react-native');
    return () => <Text testID="mission-history-screen">Mission History</Text>;
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import DailyMissions from '../pages/DailyMissions';
import { archiveDay, loadDailyDoc, saveDailyDoc } from './missionEngine';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockUser = { uid: 'test-uid-123' };

const mockDomainScores = {
    spirituality: 80, relationships: 80,
    productivity: 80, health: 80, finance: 20,
};

const todaysMissions = [
    { domain: 'finance',      text: 'Avoid unnecessary spending today', completed: false },
    { domain: 'health',       text: 'Drink more water today',           completed: false },
    { domain: 'spirituality', text: 'Sit in silence for 5 minutes',     completed: false },
];

// A stored doc that matches today — component should restore without regenerating.
const storedTodayDoc = {
    dayKey:       '2025-05-15',
    weekKey:      '2025-W20',
    fixedDomains: ['finance'],
    weeklyUsed:   ['Avoid unnecessary spending today'],
    missions:     todaysMissions,
};

// A stored doc from yesterday — component should archive and regenerate.
const storedYesterdayDoc = {
    dayKey:       '2025-05-14',
    weekKey:      '2025-W20',
    fixedDomains: ['finance'],
    weeklyUsed:   ['Track your spending for today'],
    missions: [
        { domain: 'finance',      text: 'Track your spending for today',    completed: true  },
        { domain: 'health',       text: 'Drink more water today',           completed: false },
        { domain: 'productivity', text: 'Plan your top 3 tasks for today',  completed: true  },
    ],
};

beforeEach(() => {
    jest.clearAllMocks();
    saveDailyDoc.mockResolvedValue(undefined);
    archiveDay.mockResolvedValue(undefined);
});

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state', () => {
    test('shows loading text while Firestore call is pending', () => {
        loadDailyDoc.mockReturnValue(new Promise(() => {})); // never resolves

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        expect(screen.getByText(/loading your daily missions/i)).toBeOnTheScreen();
    });
});

// ─── Rendering today's missions ───────────────────────────────────────────────

describe("rendering today's missions", () => {
    test('displays all 3 mission texts', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText('Avoid unnecessary spending today')).toBeOnTheScreen();
            expect(screen.getByText('Drink more water today')).toBeOnTheScreen();
            expect(screen.getByText('Sit in silence for 5 minutes')).toBeOnTheScreen();
        });
    });

    test('shows 0/3 done progress on fresh load', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText(/0\/3 done/i)).toBeOnTheScreen();
        });
    });

    test('shows domain tags for each mission', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText(/Financial Wellbeing/i)).toBeOnTheScreen();
            expect(screen.getByText(/💪 Health/i)).toBeOnTheScreen();
            expect(screen.getByText(/Spirituality/i)).toBeOnTheScreen();
        });
    });

    test('does not show completion banner when no missions done', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText('Drink more water today'));

        expect(screen.queryByText(/all missions complete/i)).not.toBeOnTheScreen();
    });
});

// ─── Restoring existing today's doc ──────────────────────────────────────────

describe("restoring stored missions", () => {
    test("does not call saveDailyDoc when today's doc already exists", async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText('Drink more water today'));

        expect(saveDailyDoc).not.toHaveBeenCalled();
    });

    test('restores partial completion state from stored doc', async () => {
        const partiallyDone = {
            ...storedTodayDoc,
            missions: [
                { domain: 'finance',      text: 'Avoid unnecessary spending today', completed: true  },
                { domain: 'health',       text: 'Drink more water today',           completed: false },
                { domain: 'spirituality', text: 'Sit in silence for 5 minutes',     completed: false },
            ],
        };
        loadDailyDoc.mockResolvedValue(partiallyDone);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText(/1\/3 done/i)).toBeOnTheScreen();
        });
    });
});

// ─── New day: archive + regenerate ───────────────────────────────────────────

describe('new day behaviour', () => {
    test("calls archiveDay with yesterday's data", async () => {
        loadDailyDoc.mockResolvedValue(storedYesterdayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(archiveDay).toHaveBeenCalledWith(
                'test-uid-123',
                '2025-05-14',
                '2025-W20',
                storedYesterdayDoc.missions,
            );
        });
    });

    test("calls saveDailyDoc with today's key after archiving", async () => {
        loadDailyDoc.mockResolvedValue(storedYesterdayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(saveDailyDoc).toHaveBeenCalled();
            const [uid, payload] = saveDailyDoc.mock.calls[0];
            expect(uid).toBe('test-uid-123');
            expect(payload.dayKey).toBe('2025-05-15');
            expect(payload.weekKey).toBe('2025-W20');
            expect(payload.missions).toHaveLength(3);
        });
    });

    test('generates 3 new missions with no duplicate domains', async () => {
        loadDailyDoc.mockResolvedValue(storedYesterdayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(saveDailyDoc).toHaveBeenCalled();
        });

        const [, payload] = saveDailyDoc.mock.calls[0];
        const domains = payload.missions.map(m => m.domain);
        expect(new Set(domains).size).toBe(3);
    });
});

// ─── First-time user (no stored doc) ─────────────────────────────────────────

describe('first time user', () => {
    test('generates missions when no stored doc exists', async () => {
        loadDailyDoc.mockResolvedValue(null);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(saveDailyDoc).toHaveBeenCalled();
            const [, payload] = saveDailyDoc.mock.calls[0];
            expect(payload.missions).toHaveLength(3);
        });
    });

    test('does not call archiveDay when no prior doc exists', async () => {
        loadDailyDoc.mockResolvedValue(null);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => expect(saveDailyDoc).toHaveBeenCalled());

        expect(archiveDay).not.toHaveBeenCalled();
    });
});

// ─── Completing missions ──────────────────────────────────────────────────────

describe('completing missions', () => {
    test('pressing a checkbox updates progress from 0/3 to 1/3', async () => {
        loadDailyDoc
            .mockResolvedValueOnce(storedTodayDoc)  // initial load
            .mockResolvedValueOnce(storedTodayDoc); // inside toggleComplete

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText('Drink more water today'));

        const checkboxes = screen.getAllByLabelText(/mark complete/i);
        fireEvent.press(checkboxes[0]);

        await waitFor(() => {
            expect(screen.getByText(/1\/3 done/i)).toBeOnTheScreen();
        });
    });

    test('completing all 3 missions shows the congratulations banner', async () => {
        const allDone = {
            ...storedTodayDoc,
            missions: todaysMissions.map(m => ({ ...m, completed: true })),
        };
        loadDailyDoc.mockResolvedValue(allDone);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText(/all missions complete/i)).toBeOnTheScreen();
        });
    });

    test('pressing a completed checkbox unchecks it (toggles back)', async () => {
        const oneComplete = {
            ...storedTodayDoc,
            missions: [
                { domain: 'finance',      text: 'Avoid unnecessary spending today', completed: true  },
                { domain: 'health',       text: 'Drink more water today',           completed: false },
                { domain: 'spirituality', text: 'Sit in silence for 5 minutes',     completed: false },
            ],
        };
        loadDailyDoc
            .mockResolvedValueOnce(oneComplete)  // initial load
            .mockResolvedValueOnce(oneComplete); // inside toggleComplete

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText(/1\/3 done/i));

        const doneCheckbox = screen.getByLabelText(/mark incomplete/i);
        fireEvent.press(doneCheckbox);

        await waitFor(() => {
            expect(screen.getByText(/0\/3 done/i)).toBeOnTheScreen();
        });
    });

    test('toggling a mission persists the change to Firestore', async () => {
        loadDailyDoc
            .mockResolvedValueOnce(storedTodayDoc)
            .mockResolvedValueOnce(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText('Drink more water today'));

        const checkboxes = screen.getAllByLabelText(/mark complete/i);
        fireEvent.press(checkboxes[0]);

        await waitFor(() => {
            expect(saveDailyDoc).toHaveBeenCalled();
            const [uid, payload] = saveDailyDoc.mock.calls[0];
            expect(uid).toBe('test-uid-123');
            expect(payload.missions[0].completed).toBe(true);
        });
    });
});

// ─── History button ───────────────────────────────────────────────────────────

describe('history navigation', () => {
    test('History button is visible after load', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => {
            expect(screen.getByText(/history/i)).toBeOnTheScreen();
        });
    });

    test('pressing History shows the MissionHistory screen', async () => {
        loadDailyDoc.mockResolvedValue(storedTodayDoc);

        render(<DailyMissions user={mockUser} domainScores={mockDomainScores} />);

        await waitFor(() => screen.getByText(/history/i));

        fireEvent.press(screen.getByText(/history/i));

        expect(screen.getByTestId('mission-history-screen')).toBeOnTheScreen();
    });
});
