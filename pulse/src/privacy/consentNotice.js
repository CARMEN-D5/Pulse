export const SHORT_NOTICE =
    'Pulse keeps a private record of how you are tracking across five areas of your life. ' +
    'To do that we collect your name and email address when you sign up, and then store the ' +
    'check-ins, moods, notes, goals, and messages you choose to record. ' +
    'Your entries are yours. We do not sell them or use them for marketing purposes.  '

export const NOTICE_SECTIONS = [
    {
        id: 'who',
        app: 'APP 5.2(a)',
        heading: 'Who is collecting your information',
        body:
        // will need to get actual contact details.
            `Pulse is operated by the PULSE Team. You can reach us at the Pulse contact email about anything in this notice.`,
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
        body:
            'Pulse runs on Google Firebase. Depending on the region our project is configured for, ' +
            'your information may be stored on servers located in COUNTRY_LIST. ' +
            'Our privacy policy lists the current locations.',
    },
    {
        id: 'access',
        app: 'APP 5.2(g)',
        heading: 'Accessing, correcting and deleting your information',
        body:
            'You can edit your profile and your entries in the app at any time. ' +
            'You can ask us for a copy of everything we hold about you, ask us to correct it, ' +
            'or delete your account and its contents. Our privacy policy explains how.',
    },
    {
        id: 'complaints',
        app: 'APP 5.2(h)',
        heading: 'Complaints',
        body:
        // need to get details for contact.
            `If you think we have mishandled your information, email the PULSE Team contact and we will respond within 30 days. ` +
            'If you are not satisfied you can complain to the Office of the Australian Information ' +
            'Commissioner at oaic.gov.au.',
    },
];

/**
 * Optional processing. not necessary to run the app, so opt-in,
 * unticked by default, and refusing must not block access.
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


/**
 * APP 3.3 permits collection of sensitive information only where the
 * individual consents and the collection is reasonably necessary.
 * OAIC treats valid consent as: voluntary, informed, current, specific,
 * and given by a person with capacity. A tick buried in a general
 * "I agree to everything" box fails "specific".
 *
 * This is why it is its own screen, with its own record, and why declining
 * it must leave a usable app rather than a dead end.
 */
export const SENSITIVE_CONSENT = {
    heading: 'Two questions before you start',
    body:
        'The next few questions ask how you are going with your health and with your spiritual life.\n\n' +
        'Australian privacy law treats information about your health and about religious or spiritual ' +
        'beliefs as sensitive, and we are only allowed to collect it if you specifically agree.\n\n' +
        'If you would rather not, you can skip those two areas. Pulse will still track the other three, ' +
        'and you can turn them on later in Settings.',
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
    acceptLabel: 'Yes, include these',
    declineLabel: 'Skip these two areas',
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
