jest.mock('../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    collection: jest.fn(),
    getDocs: jest.fn(),
    orderBy: jest.fn(),
    query: jest.fn((q) => q),
}));

import { formatWeekRange } from './MissionHistory';

describe('MissionHistory week summary', () => {
    test('formats the existing Monday-to-Sunday week as a dynamic range', () => {
        expect(formatWeekRange(new Date(2025, 7, 14))).toBe('11–17 August');
    });

    test('includes both month names when the ISO week crosses a month boundary', () => {
        expect(formatWeekRange(new Date(2025, 8, 2))).toBe('1–7 September');
        expect(formatWeekRange(new Date(2025, 8, 30))).toBe('29 September–5 October');
    });
});
