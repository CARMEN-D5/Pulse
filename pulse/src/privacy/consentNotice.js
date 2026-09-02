/* ================================================================
 * Contact details
 *
 * Pulse has no contact address or website yet. Rather than shipping a
 * placeholder string that renders as real text — or gets passed to
 * Linking.openURL and throws — the unset values are null and every piece of
 * copy below adapts to their absence.
 *
 * TODO(privacy): set `email` and `privacyPolicyUrl` before release.
 * APP 5.2(a) requires contact details and APP 5.2(h) requires a complaints
 * route, so the notice is not complete until these exist. The OAIC path is
 * always available and is used as the fallback in the meantime.
 * ================================================================ */
export const CONTACT = {
    entityName: 'the Pulse Team',
    email: null,
    privacyPolicyUrl: null,
    // TODO(privacy): name the countries once the Firebase region is confirmed.
    storageCountries: null,
};

/**
 * Returns a URL safe to hand to Linking.openURL, or null.
 *
 * Guards every way this can be unusable, because each of them reaches the
 * user as a crash rather than a broken link:
 *   - the constant is unset or was deleted   -> null / undefined
 *   - it is not a string                     -> Invariant Violation
 *   - it is not an http(s) URL               -> Linking rejects it
 *   - an unreplaced placeholder              -> resolves to nothing real,
 *                                               which is worse than no link
 *
 * Callers hide the link entirely when this returns null.
 */
export function privacyPolicyUrl() {
    const raw = CONTACT.privacyPolicyUrl;
    if (typeof raw !== 'string') return null;

    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) return null;
    if (/PULSE_DOMAIN|YOUR_DOMAIN|example\.com/i.test(url)) return null;

    return url;
}

/** Contact email if one is configured, else null. */
export function contactEmail() {
    const raw = CONTACT.email;
    if (typeof raw !== 'string') return null;
    const email = raw.trim();
    return /.+@.+\..+/.test(email) ? email : null;
}

// Phrases used in several sections. Written as functions of what is actually
// configured so the notice never promises a channel that does not exist.
const EMAIL = contactEmail();
const reachUs = EMAIL
    ? `You can reach us at ${EMAIL} about anything in this notice.`
    : 'Contact details for privacy enquiries will be published with the app’s release.';
const complainTo = EMAIL
    ? `If you think we have mishandled your information, email ${EMAIL} and we will respond within 30 days.`
    : 'If you think we have mishandled your information, raise it with us through the app and we will respond within 30 days.';

/* ================================================================
 * PART 1 — First-launch collection notice (APP 5)
 * ================================================================ */

/** Layer 1 — short notice, readable without scrolling. */
export const SHORT_NOTICE =
    'Pulse keeps a private record of how you are tracking across five areas of your life. ' +
    'To do that we collect your name and email address when you sign up, and then store the ' +
    'check-ins, moods, notes, goals, and messages you choose to record. ' +
    'Your entries are yours. We do not sell them or use them for marketing purposes.';

/** Layer 2 — expandable detail. Each entry maps to an APP 5.2 matter. */
export const NOTICE_SECTIONS = [
    {
        id: 'who',
        app: 'APP 5.2(a)',
        heading: 'Who is collecting your information',
        body: `Pulse is operated by ${CONTACT.entityName}. ${reachUs}`,
    },
    {
        id: 'what',
        app: 'APP 5.2(b)',
        heading: 'What we collect and when',
        body:
            'When you sign up: your name and email address.\n\n' +
            'As you use Pulse, and only when you choose to enter it:\n' +
            '• your ratings for spirituality, relationships, health, productivity and finances\n' +
            '• mood check-ins, emotion tags and journal notes\n' +
            '• the physical activity you log against the health domain\n' +
            '• budgets, spending, savings goals and milestones\n' +
            '• daily missions and to-do items\n' +
            '• posts, friend connections and direct messages, if you use the social features\n' +
            '• a profile photo, if you add one\n\n' +
            'We also receive basic technical information from your device when it connects to our service.',
    },
    {
        id: 'why',
        app: 'APP 5.2(d)',
        heading: 'Why we collect it',
        body:
            'Your email address identifies your account and lets you sign in and recover access. ' +
            'Your name personalises the app and is shown to friends you connect with. ' +
            'Your entries are used to calculate your scores, generate your daily missions, and show you ' +
            'your progress over time. Anything you post or send is shared with the people you send it to. ' +
            'We use your email to send you service messages such as password resets.',
    },
    {
        id: 'law',
        app: 'APP 5.2(c)',
        heading: 'Is this required by law?',
        body:
            'No Australian law requires us to collect this information. We collect it because it is ' +
            'reasonably necessary to provide the app.',
    },
    {
        id: 'consequences',
        app: 'APP 5.2(e)',
        heading: 'If you do not provide it',
        body:
            'You cannot create a Pulse account without a name and email address. ' +
            'Everything else is optional — you can skip any check-in, leave any domain untracked, ' +
            'and ignore the social features entirely. Your scores will simply be less complete.',
    },
    {
        id: 'disclosure',
        app: 'APP 5.2(f)',
        heading: 'Who we share it with',
        body:
            'Other Pulse users see only what you deliberately share: posts you publish, messages you send, ' +
            'and your name and photo to people you connect with. ' +
            'Behind the scenes we use Google Firebase to authenticate you and store your data. ' +
            'We do not sell your information or disclose it for advertising.',
    },
    {
        id: 'overseas',
        app: 'APP 5.2(j) / APP 8',
        heading: 'Where your information is stored',
        body: CONTACT.storageCountries
            ? 'Pulse runs on Google Firebase. Your information may be stored on servers located in ' +
            `${CONTACT.storageCountries}.`
            : 'Pulse runs on Google Firebase, so your information may be stored on servers outside ' +
            'Australia. We remain accountable for how it is handled.',
    },
    {
        id: 'access',
        app: 'APP 5.2(g)',
        heading: 'Accessing, correcting and deleting your information',
        body:
            'You can edit your profile and your entries in the app at any time. ' +
            'You can ask us for a copy of everything we hold about you, ask us to correct it, ' +
            'or delete your account and its contents.',
    },
    {
        id: 'complaints',
        app: 'APP 5.2(h)',
        heading: 'Complaints',
        body:
            `${complainTo} ` +
            'If you are not satisfied you can complain to the Office of the Australian Information ' +
            'Commissioner at oaic.gov.au.',
    },
];

/**
 * Optional processing which is not necessary to run the app, so opt-in, unticked by
 * default, and refusing must not block access.
 */
export const OPTIONAL_CONSENTS = [
    {
        key: 'analyticsConsent',
        label: 'Help improve Pulse',
        description:
            'Share anonymous usage and crash information so we can find bugs. Never linked to your entries.',
    },
    {
        key: 'remindersConsent',
        label: 'Send me reminders',
        description:
            'Occasional notifications reminding you to check in. Change this any time in Settings.',
    },
];

/* ================================================================
 * PART 2 — Sensitive information consent (APP 3.3)
 * ================================================================ */

/**
 * APP 3.3 permits collection of sensitive information only where the
 * individual consents and the collection is reasonably necessary. OAIC treats
 * valid consent as voluntary, informed, current, SPECIFIC, and given by a
 * person with capacity. A tick buried in a general "I agree to everything"
 * box fails "specific", which is why these are individually switchable.
 *
 * Declining must allow app to be ususable still, so consent is voluntary.
 */
export const SENSITIVE_CONSENT = {
    heading: 'Two questions before you start',
    body:
        'The next few questions ask how you are going with your health and with your spiritual life.\n\n' +
        'Australian privacy law treats information about your health and about religious or spiritual ' +
        'beliefs as sensitive, and we are only allowed to collect it if you specifically agree.\n\n' +
        'If you would rather not, you can skip those two areas. Pulse will still track the other three, ' +
        'and you can turn them on later in your profile.',
    items: [
        {
            key: 'healthConsent',
            label: 'Track my health and activity',
            description:
                'Your health rating, the activity you log, and your mood check-ins. Stored against your ' +
                'account and visible only to you, unless you choose to share a post.',
        },
        {
            key: 'spiritualityConsent',
            label: 'Track my spirituality',
            description:
                'Spirituality ratings and reflections. Stored against your account, visible only to you ' +
                'unless you choose to share a post.',
        },
    ],
};

/**
 * Domains gated behind SENSITIVE_CONSENT, as
 *   <EntryQuiz domain id> : <consent record field>
 *
 * EntryQuiz's ids happen to match the record fields here; App.js maps the
 * quiz ids to scoring-engine keys separately via ENTRY_QUIZ_KEY_MAP.
 *
 * If the user declines, EntryQuiz skips these ids, Home should hide the
 * cards, and the scoring engine should treat them as untracked, not zero.
 */
export const SENSITIVE_DOMAINS = {
    health: 'health',
    spirituality: 'spirituality',
};