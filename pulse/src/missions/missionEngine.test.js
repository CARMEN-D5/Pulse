/**
 * missionEngine.test
 * ─────────────────────────────────────────────────────────────────────────────
 * Unit tests for the pure-logic functions in missionEngine.js.
 * No Firebase, no React — fast and isolated.
 *
 * Run with: npm test
 */

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

import {
    getWeekKey,
    getDayKey,
    analyseScores,
    generateDailyMissions,
} from './missionEngine';

import { MISSION_POOLS, ALL_DOMAINS } from './missionPools';



// ─── getWeekKey ───────────────────────────────────────────────────────────────

describe('getWeekKey', () => {
    test('returns a string in YYYY-Www format', () => {
        const key = getWeekKey(new Date('2025-01-06')); // Monday of W02
        expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });

    test('same week → same key for Mon and Sun', () => {
        const mon = getWeekKey(new Date('2025-05-12')); // Monday
        const sun = getWeekKey(new Date('2025-05-18')); // Sunday
        expect(mon).toBe(sun);
    });

    test('different weeks → different keys', () => {
        const w1 = getWeekKey(new Date('2025-05-12'));
        const w2 = getWeekKey(new Date('2025-05-19'));
        expect(w1).not.toBe(w2);
    });

    test('returns current week when called with no argument', () => {
        const key = getWeekKey();
        expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });
});

// ─── getDayKey ────────────────────────────────────────────────────────────────

describe('getDayKey', () => {
    test('returns YYYY-MM-DD format', () => {
        const key = getDayKey(new Date('2025-05-15T10:00:00Z'));
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('different dates → different keys', () => {
        const d1 = getDayKey(new Date('2025-05-15T00:00:00Z'));
        const d2 = getDayKey(new Date('2025-05-16T00:00:00Z'));
        expect(d1).not.toBe(d2);
    });

    test('returns a key when called with no argument', () => {
        expect(() => getDayKey()).not.toThrow();
        expect(getDayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ─── analyseScores ────────────────────────────────────────────────────────────

describe('analyseScores', () => {
    test('all equal scores → no fixed domains', () => {
        const scores = {
            spirituality: 70, relationships: 70,
            productivity: 70, health: 70, finance: 70,
        };
        const { lowestDomain, secondLowestDomain } = analyseScores(scores);
        expect(lowestDomain).toBeNull();
        expect(secondLowestDomain).toBeNull();
    });

    test('one clear lowest → only lowestDomain set', () => {
        const scores = {
            spirituality: 80, relationships: 80,
            productivity: 80, health: 80, finance: 40,
        };
        const { lowestDomain, secondLowestDomain } = analyseScores(scores);
        expect(lowestDomain).toBe('finance');
        expect(secondLowestDomain).toBeNull();
    });

    test('two clear lowest → both lowestDomain and secondLowestDomain set', () => {
        const scores = {
            spirituality: 90, relationships: 90,
            productivity: 90, health: 50, finance: 30,
        };
        const { lowestDomain, secondLowestDomain } = analyseScores(scores);
        expect(lowestDomain).toBe('finance');
        expect(secondLowestDomain).toBe('health');
    });

    test('three different scores → only two lowest are fixed', () => {
        // finance=20, health=40, rest=80 → finance lowest, health second
        const scores = {
            spirituality: 80, relationships: 80,
            productivity: 80, health: 40, finance: 20,
        };
        const { lowestDomain, secondLowestDomain } = analyseScores(scores);
        expect(lowestDomain).toBe('finance');
        expect(secondLowestDomain).toBe('health');
    });

    test('missing scores default to 50', () => {
        // passing an empty object → all default to 50 → all equal → no fixed
        const { lowestDomain, secondLowestDomain } = analyseScores({});
        expect(lowestDomain).toBeNull();
        expect(secondLowestDomain).toBeNull();
    });

    test('two domains tied for lowest → only one lowest, no second', () => {
        const scores = {
            spirituality: 80, relationships: 80,
            productivity: 80, health: 40, finance: 40,
        };
        // finance and health are tied at 40; neither is strictly lower than the other
        const { lowestDomain, secondLowestDomain } = analyseScores(scores);
        // lowestDomain will be one of them (sort is stable for equal values)
        // but secondLowest must be null (tied scores = no strict gap)
        expect(secondLowestDomain).toBeNull();
    });
});

// ─── generateDailyMissions ────────────────────────────────────────────────────

describe('generateDailyMissions', () => {
    const balancedScores = {
        spirituality: 70, relationships: 70,
        productivity: 70, health: 70, finance: 70,
    };

    const unevenScores = {
        spirituality: 80, relationships: 80,
        productivity: 80, health: 80, finance: 20,
    };

    test('always returns exactly 3 missions', () => {
        const missions = generateDailyMissions(balancedScores, [], []);
        expect(missions).toHaveLength(3);
    });

    test('all 3 missions are from different domains', () => {
        const missions = generateDailyMissions(balancedScores, [], []);
        const domains = missions.map(m => m.domain);
        const unique = new Set(domains);
        expect(unique.size).toBe(3);
    });

    test('each mission has a non-empty text string', () => {
        const missions = generateDailyMissions(balancedScores, [], []);
        missions.forEach(m => {
            expect(typeof m.text).toBe('string');
            expect(m.text.length).toBeGreaterThan(0);
        });
    });

    test('each mission text exists in its domain pool', () => {
        const missions = generateDailyMissions(balancedScores, [], []);
        missions.forEach(m => {
            expect(MISSION_POOLS[m.domain]).toContain(m.text);
        });
    });

    test('fixed domains always appear in output', () => {
        const fixedDomains = ['finance'];
        const missions = generateDailyMissions(unevenScores, [], fixedDomains);
        const domains = missions.map(m => m.domain);
        expect(domains).toContain('finance');
    });

    test('two fixed domains both appear in output', () => {
        const fixedDomains = ['finance', 'health'];
        const scores = {
            spirituality: 90, relationships: 90,
            productivity: 90, health: 50, finance: 20,
        };
        const missions = generateDailyMissions(scores, [], fixedDomains);
        const domains = missions.map(m => m.domain);
        expect(domains).toContain('finance');
        expect(domains).toContain('health');
    });

    test('avoids mission texts already used this week', () => {
        // Use up all but one mission in the finance pool
        const financePool = MISSION_POOLS['finance'];
        const usedThisWeek = financePool.slice(0, financePool.length - 1);

        // Run many times to confirm the last unused item is always picked
        for (let i = 0; i < 10; i++) {
            const missions = generateDailyMissions(balancedScores, usedThisWeek, ['finance']);
            const financeMission = missions.find(m => m.domain === 'finance');
            expect(financeMission.text).toBe(financePool[financePool.length - 1]);
        }
    });

    test('falls back to full pool when all missions used this week', () => {
        // All finance missions used → should still return a finance mission (fallback)
        const usedThisWeek = [...MISSION_POOLS['finance']];
        const missions = generateDailyMissions(balancedScores, usedThisWeek, ['finance']);
        const financeMission = missions.find(m => m.domain === 'finance');
        expect(financeMission).toBeDefined();
        expect(MISSION_POOLS['finance']).toContain(financeMission.text);
    });

    test('domains of output are all valid domain keys', () => {
        const missions = generateDailyMissions(balancedScores, [], []);
        missions.forEach(m => {
            expect(ALL_DOMAINS).toContain(m.domain);
        });
    });

    test('no duplicate domains even with no fixed domains', () => {
        // Run 20 times to reduce flakiness
        for (let i = 0; i < 20; i++) {
            const missions = generateDailyMissions(balancedScores, [], []);
            const domains = missions.map(m => m.domain);
            const unique = new Set(domains);
            expect(unique.size).toBe(3);
        }
    });
});

// ─── missionPools integrity ───────────────────────────────────────────────────

describe('missionPools integrity', () => {
    test('every domain has a pool with at least 3 missions', () => {
        ALL_DOMAINS.forEach(key => {
            expect(MISSION_POOLS[key]).toBeDefined();
            expect(MISSION_POOLS[key].length).toBeGreaterThanOrEqual(3);
        });
    });

    test('no duplicate mission texts within a single domain pool', () => {
        ALL_DOMAINS.forEach(key => {
            const pool = MISSION_POOLS[key];
            const unique = new Set(pool);
            expect(unique.size).toBe(pool.length);
        });
    });

    test('all mission texts are non-empty strings', () => {
        ALL_DOMAINS.forEach(key => {
            MISSION_POOLS[key].forEach(text => {
                expect(typeof text).toBe('string');
                expect(text.trim().length).toBeGreaterThan(0);
            });
        });
    });
});