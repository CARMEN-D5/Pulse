import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the auth service so the test doesn't touch real Firebase.
jest.mock('./auth/authService', () => ({
  signUp: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  resetPassword: jest.fn(),
  onAuthChange: (cb) => {
    // Simulate "no user logged in" so App renders the splash screen.
    cb(null);
    return () => {};
  },
}));

test('renders the Pulse splash screen when logged out', () => {
  render(<App />);
  expect(screen.getByText(/Welcome to Pulse/i)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /I'm already a member — Log in/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Create an account/i })
  ).toBeInTheDocument();
});
