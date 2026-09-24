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
jest.mock('./pages/DailyMissions', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockDailyMissions() {
    return <Text>Today's Daily Missions</Text>;
  };
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import React from 'react';

import AppShell from './components/AppShell';
import Dropdown, { getDropdownMenuPlacement } from './components/Dropdown';
import { Card } from './components/ui';
import Features from './pages/Features';
import Home, { getOverviewMetrics } from './pages/Home';
import EntryQuiz from './pages/EntryQuiz';
import Login from './pages/Login';
import Profile from './pages/Profile';
import { getTrendTone } from './pages/ProgressAnalytics';
import Splash from './pages/Splash';
import authStyles from './pages/authStyles';
import { DOMAIN_META } from './missions/missionPools';
import { colors, DOMAIN_COLORS, domains, profileColors, spacing } from './theme';

function findSubtleCards(node, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  const style = StyleSheet.flatten(node.props?.style);
  if (
    style?.backgroundColor === colors.card &&
    style?.borderColor === colors.border &&
    style?.borderWidth === 1 &&
    style?.elevation === 1
  ) {
    matches.push(node);
  }
  const children = Array.isArray(node.children) ? node.children : [];
  children.forEach((child) => findSubtleCards(child, matches));
  return matches;
}

test('subtle onboarding cards use a thin edge instead of a padded translucent shell', () => {
  const rendered = render(
    <Card subtle>
      <Text>Compact onboarding card</Text>
    </Card>
  );

  expect(StyleSheet.flatten(rendered.toJSON().props.style)).toMatchObject({
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    elevation: 1,
    padding: 12,
  });
});

test('Landing and Sign In use the same subtle card surface as onboarding', () => {
  const landing = render(<Splash onLogin={jest.fn()} onSignUp={jest.fn()} />);
  expect(findSubtleCards(landing.toJSON())).toHaveLength(2);
  landing.unmount();

  const login = render(
    <Login
      onSubmit={jest.fn()}
      onForgotPassword={jest.fn()}
      onSwitchToSignUp={jest.fn()}
    />
  );
  expect(findSubtleCards(login.toJSON())).toHaveLength(1);
  expect(authStyles.forgotRow.marginTop).toBe(spacing.sm);
});

test('all domain surfaces use the shared softer palette', () => {
  expect(DOMAIN_COLORS).toEqual({
    spirituality: '#D9BE78',
    health: '#C98692',
    relationships: '#AA96BE',
    finance: '#82A58E',
    productivity: '#819CB6',
  });
  Object.keys(DOMAIN_COLORS).forEach((key) => {
    expect(domains[key].color).toBe(DOMAIN_COLORS[key]);
    expect(DOMAIN_META[key].color).toBe(DOMAIN_COLORS[key]);
  });
});

test('Profile uses a near-white, low-colour hero gradient', () => {
  expect(profileColors.gradient).toEqual(['#FFF8F8', '#FAF3F5']);
  expect(profileColors.accent).toBe('#B96A7E');
});

test('Profile trend tags use semantic positive, negative and neutral tones', () => {
  expect(getTrendTone(2.2)).toEqual({
    icon: 'arrow_upward', text: '#4F9B78', background: '#EEF7F2',
  });
  expect(getTrendTone(-1.2)).toEqual({
    icon: 'arrow_downward', text: '#C85F78', background: '#FBEFF2',
  });
  expect(getTrendTone(0)).toEqual({
    icon: 'remove', text: '#88827F', background: '#F4F2F1',
  });
});

test('Entry Quiz selections use the matching domain colours', () => {
  render(<EntryQuiz onComplete={jest.fn()} />);

  fireEvent.press(screen.getAllByLabelText('1, Never')[0]);
  expect(StyleSheet.flatten(screen.getAllByLabelText('1, Never')[0].props.style).borderColor)
    .toBe(DOMAIN_COLORS.spirituality);

  fireEvent.press(screen.getAllByLabelText('1, Never')[1]);
  expect(StyleSheet.flatten(screen.getAllByLabelText('1, Never')[1].props.style).borderColor)
    .toBe(DOMAIN_COLORS.relationships);
});

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

  const avatarTouchTarget = StyleSheet.flatten(screen.getByLabelText('Open profile').props.style);
  expect(avatarTouchTarget.width).toBeGreaterThanOrEqual(44);
  expect(avatarTouchTarget.height).toBeGreaterThanOrEqual(44);
});

test('Features lists every tool and reports the tapped id', () => {
  const onOpen = jest.fn();
  render(<Features onOpen={onOpen} />);
  expect(screen.getByText('Tools')).toBeOnTheScreen();
  ['Journal', 'To-do List', 'Finance Tracker', 'Physical Activity Tracker', 'Daily Missions']
    .forEach((l) => expect(screen.getByText(l)).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Finance Tracker'));
  expect(onOpen).toHaveBeenCalledWith('finance');
});

test('Dropdown disables its trigger when no options are available', () => {
  render(
    <Dropdown
      label="Priority"
      accessibilityLabel="Priority"
      options={[]}
      value={null}
      onChange={jest.fn()}
    />
  );

  const trigger = screen.getByLabelText('Priority');
  expect(trigger.props.accessibilityState).toMatchObject({ disabled: true, expanded: false });
  expect(screen.getByText('No options available')).toBeOnTheScreen();
  fireEvent.press(trigger);
  expect(screen.queryByTestId('dropdown-options-modal')).toBeNull();
});

test('Dropdown opens below when there is room and flips above near the viewport bottom', () => {
  const below = getDropdownMenuPlacement({
    triggerY: 100,
    triggerHeight: 40,
    screenHeight: 800,
    optionCount: 3,
  });
  expect(below.openUpward).toBe(false);
  expect(below.top).toBe(144);
  expect(below.top + below.maxHeight).toBeLessThanOrEqual(792);

  const above = getDropdownMenuPlacement({
    triggerY: 700,
    triggerHeight: 40,
    screenHeight: 800,
    optionCount: 4,
  });
  expect(above.openUpward).toBe(true);
  expect(above.top).toBeLessThan(700);
  expect(above.top).toBeGreaterThanOrEqual(8);
  expect(above.top + above.maxHeight).toBeLessThanOrEqual(700);
});

test('Home shows Diagram first and keeps its status below the radar', async () => {
  const onNavigate = jest.fn();
  const rendered = render(
    <Home
      user={{ uid: 'u1', displayName: 'Ada' }}
      userDoc={{ onboardingCompletedAt: 1 }}
      scoreVersion={0}
      onNavigate={onNavigate}
    />
  );

  await waitFor(() => expect(screen.getByText("Today's Daily Missions")).toBeOnTheScreen());

  // Diagram tab is the default: the enlarged radar with the balance score
  // centered inside it.
  expect(screen.getByText('62')).toBeOnTheScreen();
  const homeTree = JSON.stringify(rendered.toJSON());
  expect(homeTree.indexOf('home-overview-tab-diagram')).toBeLessThan(
    homeTree.indexOf('home-overview-tab-details')
  );
  expect(homeTree.indexOf('home-radar-chart')).toBeLessThan(
    homeTree.indexOf('home-balance-status')
  );
  const diagramContentHeight = StyleSheet.flatten(
    screen.getByTestId('home-overview-content').props.style
  ).height;

  // Details tab lists every domain with its status label. Domain rows are
  // static (no tap-through) in the redesigned Home.
  fireEvent.press(screen.getByText('Details'));
  const detailsContentHeight = StyleSheet.flatten(
    screen.getByTestId('home-overview-content').props.style
  ).height;
  expect(detailsContentHeight).toBe(diagramContentHeight);
  expect(screen.getByText('Spirituality')).toBeOnTheScreen();
  expect(screen.getByText('Financial Wellbeing')).toBeOnTheScreen();
  expect(screen.getByText('Building')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Strengthen Connections'));
  expect(onNavigate).toHaveBeenCalledWith('relationships');
});

test('Home overview sizing is responsive and bounded', () => {
  expect(getOverviewMetrics(280)).toEqual({ contentHeight: 260, radarHeight: 232 });
  expect(getOverviewMetrics(400)).toEqual({ contentHeight: 270, radarHeight: 242 });
  expect(getOverviewMetrics(700)).toEqual({ contentHeight: 280, radarHeight: 252 });
});

test('Profile shows the account header and opens the settings menu', async () => {
  const onLogout = jest.fn();
  render(<Profile user={{ uid: 'u1', displayName: 'Ada Lovelace' }} onLogout={onLogout} />);

  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeOnTheScreen());
  expect(screen.getByText('Ada Lovelace')).toHaveStyle({ color: colors.text });
  fireEvent.press(screen.getByLabelText('Settings'));
  fireEvent.press(screen.getByText('Log out'));
  expect(onLogout).toHaveBeenCalled();
});
