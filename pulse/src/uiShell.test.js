jest.mock('./firebase', () => ({ app: {}, auth: {}, db: {}, storage: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(),
  addDoc: jest.fn(), deleteDoc: jest.fn(), collection: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })), onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(),
  serverTimestamp: jest.fn(), increment: jest.fn(), writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));
jest.mock('firebase/storage', () => ({
  ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn(),
}));

jest.mock('./firestore/scoring', () => ({
  computeCurrentScores: jest.fn(async () => ({
    balancedLifeScore: 62,
    domainScores: {
      spirituality: 80, health: 60, relationships: 40, finance: 79, productivity: 40,
    },
  })),
  logAction: jest.fn(),
  logReflection: jest.fn(),
}));
jest.mock('./missions/missionEngine', () => ({
  analyseScores: () => ({ lowestDomain: 'health', secondLowestDomain: 'finance' }),
  archiveDay: jest.fn(),
  generateDailyMissions: () => [
    { text: 'Take a 5-minute break to reset', domain: 'health' },
    { text: 'Reconnect with someone', domain: 'relationships' },
    { text: 'Take 5 minutes to reflect on your day', domain: 'spirituality' },
  ],
  getDayKey: () => '2026-08-13',
  getWeekKey: () => '2026-W33',
  loadDailyDoc: jest.fn(async () => null),
  saveDailyDoc: jest.fn(async () => {}),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import AppShell from './components/AppShell';
import Features from './pages/Features';
import Home from './pages/Home';
import Profile from './pages/Profile';

test('AppShell renders the wordmark and all four tabs', () => {
  const onTabChange = jest.fn();
  render(
    <AppShell tab="home" onTabChange={onTabChange} initials="V">
      <></>
    </AppShell>
  );
  expect(screen.getByText('PULSE')).toBeOnTheScreen();
  ['Home', 'Features', 'Social', 'Profile'].forEach((l) =>
    expect(screen.getByText(l)).toBeOnTheScreen()
  );
  fireEvent.press(screen.getByLabelText('Social'));
  expect(onTabChange).toHaveBeenCalledWith('social');
});

test('Features lists every tool and reports the tapped id', () => {
  const onOpen = jest.fn();
  render(<Features onOpen={onOpen} />);
  expect(screen.getByText('Tools')).toBeOnTheScreen();
  ['Journal', 'To-do List', 'Budget Tracker', 'Physical Activity Tracker', 'Daily Missions']
    .forEach((l) => expect(screen.getByText(l)).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Budget Tracker'));
  expect(onOpen).toHaveBeenCalledWith('finance');
});

test('Home shows the quote, missions and the Details/Diagram overview', async () => {
  const onDomainSelect = jest.fn();
  render(
    <Home
      user={{ uid: 'u1', displayName: 'Ada' }}
      userDoc={{ onboardingCompletedAt: 1 }}
      scoreVersion={0}
      onDomainSelect={onDomainSelect}
    />
  );

  await waitFor(() => expect(screen.getByText("Today's Daily Missions")).toBeOnTheScreen());

  // Details tab is the default and lists every domain with its status label.
  expect(screen.getByText('Spirituality')).toBeOnTheScreen();
  expect(screen.getByText('Financial Wellbeing')).toBeOnTheScreen();
  expect(screen.getByText('Building')).toBeOnTheScreen();

  fireEvent.press(screen.getByText('Spirituality'));
  expect(onDomainSelect).toHaveBeenCalledWith('spirituality');

  // Diagram tab swaps in the balance ring + radar.
  fireEvent.press(screen.getByText('Diagram'));
  expect(screen.getByText('LIFE BALANCE')).toBeOnTheScreen();
  expect(screen.getByText('62')).toBeOnTheScreen();
});

test('Profile shows the account header and opens the settings menu', async () => {
  const onLogout = jest.fn();
  render(<Profile user={{ uid: 'u1', displayName: 'Ada Lovelace' }} onLogout={onLogout} />);

  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeOnTheScreen());
  fireEvent.press(screen.getByLabelText('Settings'));
  fireEvent.press(screen.getByText('Log out'));
  expect(onLogout).toHaveBeenCalled();
});
