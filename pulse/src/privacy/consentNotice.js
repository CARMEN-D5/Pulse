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

/** Contact email if one is configured, else null. Same guard reasoning. */
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
 * Optional processing — not necessary to run the app, so opt-in, unticked by
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
 * PART 2 — Sensitive information (APP 3.3)
 * ================================================================ */

/**
 * Health information and information about religious or spiritual beliefs are
 * sensitive information under s6(1). APP 3.3 allows collection only with the
 * individual's consent.
 *
 * Health and spirituality are two of Pulse's five domains and are not
 * separable from the product, so they are not offered as toggles. Consent is
 * obtained instead by naming them plainly on the consent screen and treating
 * "Continue" as the agreement — the user is told exactly what is collected
 * before an account is used, and can decline by not continuing.
 *
 * The trade-off, recorded here so it is a decision and not an oversight: OAIC
 * treats valid consent as voluntary, informed, current, SPECIFIC and given
 * with capacity. Bundling weakens "specific" compared with per-domain
 * switches. What keeps it defensible is that this text names the two
 * categories directly rather than burying them in a general agreement, and
 * that the account can be deleted with its contents at any time.
 */
export const SENSITIVE_NOTICE = {
    heading: 'Health and spiritual wellbeing',
    body:
        'Two of the five areas Pulse tracks are your health and your spiritual life.\n\n' +
        'Australian privacy law treats information about health, and about religious or spiritual ' +
        'beliefs, as sensitive — a higher standard than ordinary personal information. We are only ' +
        'allowed to collect it with your agreement.\n\n' +
        'These entries are stored against your account and visible only to you, unless you choose to ' +
        'share a post. You can delete your account and everything in it at any time.',
    agreement:
        'By continuing you agree to Pulse collecting your health and spirituality entries as part of ' +
        'tracking all five areas.',
};