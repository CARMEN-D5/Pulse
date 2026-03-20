/**
 * Validation utilities — used with React Hook Form / Zod or standalone.
 */

/** Basic email format check */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Password meets minimum requirements */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/** Score is within the valid 0-100 range */
export function isValidScore(score: number): boolean {
  return score >= 0 && score <= 100 && Number.isFinite(score);
}

/** Clamp a number to the 0-100 range */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
