// Mock Firebase before any imports so the module resolver never touches real Firebase
jest.mock('../firebase', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  doc:             jest.fn(),
  updateDoc:       jest.fn(),
  collection:      jest.fn(),
  addDoc:          jest.fn(),
  getDocs:         jest.fn(),
  query:           jest.fn(q => q),   // pass-through so getDocs receives something
  where:           jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp: {
    fromDate: jest.fn(date => date),
  },
}));

import { updateDoc, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import {
  saveOnboardingBaseline,
  logReflection,
  logAction,
  computeCurrentScores,
} from './scoring';

// Helper — builds a fake Firestore snapshot from an array of plain objects
const makeSnap = (docs) => ({
  forEach: (cb) => docs.forEach(d => cb({ data: () => d })),
});

const EMPTY_SNAP = makeSnap([]);

beforeEach(() => {
  jest.clearAllMocks();
  updateDoc.mockResolvedValue(undefined);
  addDoc.mockResolvedValue({ id: 'mock-doc-id' });
  getDocs.mockResolvedValue(EMPTY_SNAP);
  // clearAllMocks wipes the implementation set in jest.mock() factory — restore it
  serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
});

// ---------------------------------------------------------------------------
// saveOnboardingBaseline
// ---------------------------------------------------------------------------
describe('saveOnboardingBaseline', () => {
  test('converts 1-5 ratings to 20-100 and calls updateDoc', async () => {
    const ratings = {
      spirituality: 3, relationships: 4,
      productivity: 2, health: 5, finance: 1,
    };

    await saveOnboardingBaseline('uid-123', ratings);

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [, patch] = updateDoc.mock.calls[0];

    expect(patch.onboardingBaseline).toEqual({
      spirituality:  60,
      relationships: 80,
      productivity:  40,
      health:        100,
      finance:       20,
    });
    expect(patch.onboardingCompletedAt).toBe('SERVER_TIMESTAMP');
  });

  test('missing rating defaults to 3 → 60', async () => {
    // Only provide 4 domains — finance is omitted
    await saveOnboardingBaseline('uid-123', {
      spirituality: 5, relationships: 5, productivity: 5, health: 5,
    });

    const [, patch] = updateDoc.mock.calls[0];
    expect(patch.onboardingBaseline.finance).toBe(60); // 3 × 20
  });

  test('returns { ok: false } when updateDoc throws', async () => {
    updateDoc.mockRejectedValueOnce(new Error('permission denied'));
    const result = await saveOnboardingBaseline('uid-123', {});
    expect(result.ok).toBe(false);
    expect(result.error).toBe('permission denied');
  });
});

// ---------------------------------------------------------------------------
// logReflection
// ---------------------------------------------------------------------------
describe('logReflection', () => {
  test('saves reflection with correct fields', async () => {
    await logReflection('uid-123', 'spirituality', 4);

    expect(addDoc).toHaveBeenCalledTimes(1);
    const [, data] = addDoc.mock.calls[0];

    expect(data.domain).toBe('spirituality');
    expect(data.rating).toBe(4);
    expect(data.createdAt).toBe('SERVER_TIMESTAMP');
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
  });

  test('returns { ok: true } on success', async () => {
    const result = await logReflection('uid-123', 'health', 5);
    expect(result.ok).toBe(true);
  });

  test('returns { ok: false } when addDoc throws', async () => {
    addDoc.mockRejectedValueOnce(new Error('network error'));
    const result = await logReflection('uid-123', 'health', 5);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logAction
// ---------------------------------------------------------------------------
describe('logAction', () => {
  test('saves action with correct points looked up from DOMAINS config', async () => {
    await logAction('uid-123', 'spirituality', 'journal');

    const [, data] = addDoc.mock.calls[0];
    expect(data.domain).toBe('spirituality');
    expect(data.actionType).toBe('journal');
    expect(data.points).toBe(50);  // from DOMAINS config
  });

  test('looks up correct points for each domain', async () => {
    await logAction('uid-123', 'productivity', 'task');
    const [, data] = addDoc.mock.calls[0];
    expect(data.points).toBe(25);  // productivity task = 25 pts
  });

  test('returns { ok: false } for unknown action type', async () => {
    const result = await logAction('uid-123', 'spirituality', 'nonexistent');
    expect(result.ok).toBe(false);
    expect(addDoc).not.toHaveBeenCalled();
  });

  test('returns { ok: false } for unknown domain', async () => {
    const result = await logAction('uid-123', 'cooking', 'recipe');
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeCurrentScores
// ---------------------------------------------------------------------------
describe('computeCurrentScores', () => {
  const mockUserDoc = {
    onboardingBaseline: {
      spirituality: 60, relationships: 80,
      productivity: 40, health: 100, finance: 60,
    },
    domainScores: null,
    createdAt: { toMillis: () => Date.now() - 86_400_000 * 5 }, // 5 days ago
  };

  test('returns null when userDoc has no onboarding baseline', async () => {
    const result = await computeCurrentScores('uid-123', {});
    expect(result).toBeNull();
  });

  test('returns baseline scores when no events this week', async () => {
    // getDocs returns empty snapshots (set in beforeEach)
    const result = await computeCurrentScores('uid-123', mockUserDoc);

    expect(result).not.toBeNull();
    // No activity → computeDomainScore returns previousScore unchanged
    expect(result.domainScores.spirituality).toBe(60);
    expect(result.domainScores.health).toBe(100);
  });

  test('computes higher score when user logs strong activity', async () => {
    // Simulate 3 reflections (rating 5) and 200 action points for spirituality
    const reflSnap = makeSnap([
      { domain: 'spirituality', rating: 5, date: '2026-04-28' },
      { domain: 'spirituality', rating: 5, date: '2026-04-29' },
      { domain: 'spirituality', rating: 5, date: '2026-04-30' },
    ]);
    const actSnap = makeSnap([
      { domain: 'spirituality', actionType: 'journal',      points: 50, date: '2026-04-28' },
      { domain: 'spirituality', actionType: 'mindfulness',  points: 50, date: '2026-04-28' },
      { domain: 'spirituality', actionType: 'journal',      points: 50, date: '2026-04-29' },
      { domain: 'spirituality', actionType: 'mindfulness',  points: 50, date: '2026-04-29' },
    ]);
    getDocs
      .mockResolvedValueOnce(reflSnap)   // reflections query
      .mockResolvedValueOnce(actSnap);   // actions query

    const result = await computeCurrentScores('uid-123', mockUserDoc);

    // Strong week → score should increase above baseline of 60
    expect(result.domainScores.spirituality).toBeGreaterThan(60);
  });

  test('persists computed scores back to Firestore', async () => {
    await computeCurrentScores('uid-123', mockUserDoc);

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const [, patch] = updateDoc.mock.calls[0];

    expect(patch).toHaveProperty('domainScores');
    expect(patch).toHaveProperty('lifeStrength');
    expect(patch).toHaveProperty('evenness');
    expect(patch).toHaveProperty('balancedLifeScore');
    expect(patch).toHaveProperty('scoresUpdatedAt');
  });

  test('uses saved domainScores as previousScore on second run', async () => {
    const userDocWithSavedScores = {
      ...mockUserDoc,
      domainScores: {
        spirituality: 65, relationships: 82,
        productivity: 44, health: 99, finance: 62,
      },
    };

    const result = await computeCurrentScores('uid-123', userDocWithSavedScores);

    // No activity this week → previousScore used directly (the saved score, not baseline)
    expect(result.domainScores.spirituality).toBe(65);  // not 60 (baseline)
    expect(result.domainScores.health).toBe(99);        // not 100 (baseline)
  });

  test('still returns scores even when Firestore subcollection query fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Missing or insufficient permissions'));

    const result = await computeCurrentScores('uid-123', mockUserDoc);

    // Falls back to baseline-only scores instead of crashing
    expect(result).not.toBeNull();
    expect(result.domainScores.spirituality).toBe(60);
  });
});
