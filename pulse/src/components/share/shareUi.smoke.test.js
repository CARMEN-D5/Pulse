// Render smoke tests for the share prompt UI.
//
// These were ported from the web build (div/className/share.css) to React
// Native during the second main -> ScoreSystem merge. templatesFor and
// serialisePayload are plain functions and worth asserting directly; the
// components just need to prove they mount under the native renderer.
jest.mock('../../firebase', () => ({ app: {}, auth: {}, db: {}, storage: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(),
  addDoc: jest.fn(), deleteDoc: jest.fn(), collection: jest.fn(),
  getDocs: jest.fn(async () => ({ docs: [] })), onSnapshot: jest.fn(() => () => {}),
  query: jest.fn((q) => q), where: jest.fn(), orderBy: jest.fn(), limit: jest.fn(),
  serverTimestamp: jest.fn(), increment: jest.fn(), writeBatch: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

import React from 'react';
import { act, render } from '@testing-library/react-native';

import { SharePromptProvider, useSharePrompt } from './SharePromptProvider';
import SharingPromptPopUp from './SharingPromptPopUp';
import TemplateCarousel from './TemplateCarousel';
import SharePostEditor from './SharePostEditor';
import ShareButton from './ShareButton';
import { templatesFor, serialisePayload, workoutStats, getTemplate } from './shareTemplates';

const USER = { uid: 'u1', displayName: 'Sam' };
const noop = () => {};

const CARDIO = { text: 'Morning run', type: 'cardio', distance: '5', duration: '00:28' };
const STRENGTH = {
  text: 'Push day',
  type: 'strength',
  exercises: [{ name: 'Bench', sets: [{ weight: '60', reps: '8' }, { weight: '60', reps: '6' }] }],
};
const TODO = { completedCount: 4, totalCount: 4, date: '2026-08-13' };
const FINANCE = { kind: 'month-under', monthLabel: 'August', totalSpent: 800, totalBudget: 1000 };

const withProvider = (ui) => (
  <SharePromptProvider user={USER} onPost={noop} onOpenSocial={noop}>
    {ui}
  </SharePromptProvider>
);

describe('template selection', () => {
  it('picks fitness templates by payload shape', () => {
    expect(templatesFor('fitness', CARDIO).map((t) => t.id)).toEqual(['fitness-cardio']);
    expect(templatesFor('fitness', STRENGTH).map((t) => t.id)).toEqual([
      'fitness-stats',
      'fitness-exercises',
    ]);
  });

  it('hides strength templates when every set is blank', () => {
    const blank = { type: 'strength', exercises: [{ name: '', sets: [{ weight: '', reps: '' }] }] };
    expect(templatesFor('fitness', blank)).toHaveLength(0);
  });

  it('hides finance templates until a budget exists', () => {
    expect(templatesFor('finance', { kind: 'month-under', totalBudget: 0 })).toHaveLength(0);
    expect(templatesFor('finance', FINANCE)).toHaveLength(1);
  });

  it('sums strength volume across sets', () => {
    expect(workoutStats(STRENGTH)).toEqual({ exerciseCount: 1, setCount: 2, volumeKg: 840 });
  });

  it('serialises numeric strings into numbers', () => {
    const out = serialisePayload('fitness', STRENGTH);
    expect(out.exercises[0].sets[0]).toEqual({ weight: 60, reps: 8 });
  });
});

describe('share UI renders under React Native', () => {
  it('renders every template card', () => {
    for (const [domain, payload] of [
      ['fitness', CARDIO],
      ['fitness', STRENGTH],
      ['todo', TODO],
      ['finance', FINANCE],
    ]) {
      for (const t of templatesFor(domain, payload)) {
        const { unmount } = render(<>{t.render(payload, { username: 'sam' })}</>);
        unmount();
      }
    }
  });

  it('TemplateCarousel', () => {
    const templates = templatesFor('fitness', STRENGTH);
    const { getByText } = render(
      <TemplateCarousel
        templates={templates}
        index={0}
        onIndexChange={noop}
        payload={STRENGTH}
        username="sam"
      />
    );
    expect(getByText('Summary')).toBeTruthy();
  });

  it('SharePostEditor prefills the reflection from the template title', () => {
    const template = getTemplate('todo-count');
    const { getByDisplayValue } = render(
      <SharePostEditor
        template={template}
        payload={TODO}
        username="sam"
        posting={false}
        error={null}
        onSubmit={noop}
        onCancel={noop}
      />
    );
    expect(getByDisplayValue('I completed all my tasks for the day!')).toBeTruthy();
  });

  it('SharingPromptPopUp', () => {
    const { getByText } = render(
      <SharingPromptPopUp
        domain="todo"
        payload={TODO}
        username="sam"
        onClose={noop}
        onPost={noop}
      />
    );
    expect(getByText('Share')).toBeTruthy();
    expect(getByText('Post →')).toBeTruthy();
  });

  it('ShareButton hides itself when nothing is shareable', () => {
    const { queryByLabelText } = render(
      withProvider(<ShareButton domain="todo" payload={{ completedCount: 0 }} />)
    );
    expect(queryByLabelText('Share to feed')).toBeNull();
  });

  it('ShareButton shows when a template is available', () => {
    const { getByLabelText } = render(withProvider(<ShareButton domain="todo" payload={TODO} />));
    expect(getByLabelText('Share to feed')).toBeTruthy();
  });
});

describe('SharePromptProvider', () => {
  it('refuses to open when signed out', () => {
    let api;
    function Probe() {
      api = useSharePrompt();
      return null;
    }
    render(
      <SharePromptProvider user={null} onPost={noop} onOpenSocial={noop}>
        <Probe />
      </SharePromptProvider>
    );
    expect(api.openSharePrompt('todo', TODO)).toBe(false);
  });

  it('refuses to open when no template fits the payload', () => {
    let api;
    function Probe() {
      api = useSharePrompt();
      return null;
    }
    render(withProvider(<Probe />));
    expect(api.openSharePrompt('todo', { completedCount: 0 })).toBe(false);
    // Opening mounts the popup, so this one moves the provider's state.
    act(() => {
      expect(api.openSharePrompt('todo', TODO)).toBe(true);
    });
  });
});
