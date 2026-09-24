/**
 * Smoke test for the app root: with no signed-in user, Pulse should land on
 * the splash screen and offer both ways in.
 *
 * Firebase is mocked at the module boundary so the test never opens a network
 * connection or needs credentials.
 */

jest.mock('./firebase', () => ({ app: {}, auth: {}, db: {}, storage: {} }));

// The Firebase SDK ships ESM that Jest's default transform chokes on
// (@firebase/util/dist/postinstall.mjs). Every suite in this repo stubs the
// SDK entry points rather than transforming them; only the call signatures
// matter here, since ./firebase is already mocked above.
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('./auth/authService', () => ({
  signUp: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  resetPassword: jest.fn(),
  onAuthChange: jest.fn(),
}));

jest.mock('./firestore/users', () => ({
  ensureUserDoc: jest.fn().mockResolvedValue({ ok: true }),
  getUserDoc: jest.fn().mockResolvedValue({ ok: true, data: null }),
  searchUserByEmail: jest.fn(),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import App from './App';
import { onAuthChange } from './auth/authService';
import { ensureUserDoc, getUserDoc } from './firestore/users';

beforeEach(() => {
  jest.clearAllMocks();
  ensureUserDoc.mockResolvedValue({ ok: true });
  getUserDoc.mockResolvedValue({ ok: true, data: null });
  onAuthChange.mockImplementation((callback) => {
    callback(null);
    return jest.fn();
  });
});

test('renders the Pulse splash screen when logged out', async () => {
  render(<App />);

  expect(await screen.findByText(/Start My Journey/i)).toBeOnTheScreen();
  expect(screen.getByText(/I already have an account/i)).toBeOnTheScreen();
  expect(screen.getByText(/Find Your Perfect/i)).toBeOnTheScreen();
});

test('shows a retry path instead of loading forever when auth initialization fails', async () => {
  onAuthChange.mockImplementation((callback) => {
    callback({ uid: 'u1', email: 'ada@example.com', displayName: 'Ada' });
    return jest.fn();
  });
  ensureUserDoc.mockResolvedValue({ ok: false, error: 'network unavailable' });

  render(<App />);

  expect(
    await screen.findByText(/couldn't finish loading your account/i)
  ).toBeOnTheScreen();
  const retry = screen.getByRole('button', { name: 'Try again' });
  fireEvent.press(retry);

  await waitFor(() => expect(ensureUserDoc).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/couldn't finish loading your account/i)).toBeOnTheScreen();
});
