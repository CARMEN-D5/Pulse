jest.mock('./adapters', () => ({ DOMAIN_META: {}, MOODS: [], MoodFace: () => null }));
jest.mock('../Icon', () => () => null);

import { serialisePayload, workoutStats } from './shareTemplates';

describe('strength sharing summaries', () => {
    test('uses Number of Sets for totals and lifted volume', () => {
        const activity = {
            type: 'strength',
            exercises: [{ name: 'Bench', sets: [{ weight: '15', reps: '12', setCount: '3' }] }],
        };
        expect(workoutStats(activity)).toEqual({
            exerciseCount: 1,
            setCount: 3,
            volumeKg: 540,
        });
    });

    test('treats legacy set records as one set and serialises the compatible value', () => {
        const activity = {
            type: 'strength',
            exercises: [{ name: 'Squat', sets: [{ weight: '40', reps: '8' }] }],
        };
        expect(workoutStats(activity)).toEqual({
            exerciseCount: 1,
            setCount: 1,
            volumeKg: 320,
        });
        expect(serialisePayload('fitness', activity).exercises[0].sets[0]).toEqual({
            weight: 40,
            reps: 8,
            setCount: 1,
        });
    });
});
