/**
 * Central repository of all daily mission text pools, keyed by domain.
 * Edit this file to add, remove, or update missions without touching any logic.
 *
 * Domain keys must match those used in scoringEngine.js:
 *   spirituality | relationships | productivity | health | finance
 */

export const MISSION_POOLS = {
    spirituality: [
        'Sit in silence for 5 minutes',
        'Focus only on your breathing for 2 minutes',
        "Write down 3 things you're grateful for",
        'Take 5 minutes to reflect on your day',
        'Spend 10 minutes without your phone',
        'Go outside and be present for 5 minutes',
        'Notice your thoughts without reacting',
        'Pause and reset during your day (2 mins)',
        'Remind yourself what truly matters today',
        'Slow down and do one task mindfully',
        'Let go of one negative thought today',
        'Take a moment to appreciate where you are in life',
    ],

    relationships: [
        'Message or call someone you care about',
        'Have one conversation with no phone',
        "Ask someone how they're really feeling",
        'Spend 10 minutes with someone important',
        'Show appreciation to someone today',
        'Listen fully without interrupting',
        'Check in on a friend or family member',
        'Be fully present during a conversation',
        'Make time for someone instead of scrolling',
        'Say something positive to someone',
        "Reconnect with someone you haven't spoken to",
        'Prioritise people over tasks today',
    ],

    productivity: [
        'Complete your most important task first',
        'Work distraction-free for 20 minutes',
        'Plan your top 3 tasks for today',
        "Finish something you've been avoiding",
        'Remove distractions and focus fully',
        'Start a task immediately (no delay)',
        'Break a task into smaller steps and begin',
        'Stay off social media during work time',
        'Focus on one task at a time',
        'Set a timer and work with full focus',
        'Finish what you start today',
        'Take a short break to reset your focus',
    ],

    health: [
        'Move your body (walk, gym, stretch)',
        'Drink more water today',
        'Take a 5-minute break to reset',
        'Get fresh air for at least 5 minutes',
        'Eat one healthy meal',
        'Go to bed earlier tonight',
        'Take a moment to relax and breathe',
        'Avoid junk food today',
        'Do something that reduces stress',
        'Stretch your body for 5 minutes',
        'Check in with how you feel physically',
        'Rest when your body needs it',
    ],

    finance: [
        'Avoid unnecessary spending today',
        'Think before making any purchase',
        'Track your spending for today',
        'Stick to your budget',
        'Save a small amount of money',
        'Delay a purchase for 24 hours',
        'Review your recent spending',
        'Make a financially smart decision today',
        'Avoid impulse buying',
        'Plan your next expense carefully',
        'Focus on needs, not wants today',
        'Take control of your money decisions',
    ],
};

/** Human-readable metadata for each domain. */
export const DOMAIN_META = {
    spirituality:  { label: 'Spirituality',        icon: '🧘', color: '#7c3aed' },
    relationships: { label: 'Family & Friends',     icon: '🤝', color: '#f59e0b' },
    productivity:  { label: 'Work / Productivity',  icon: '💼', color: '#3b82f6' },
    health:        { label: 'Health',               icon: '💪', color: '#10b981' },
    finance:       { label: 'Financial Wellbeing',  icon: '💰', color: '#ef4444' },
};

/** Ordered list of all domain keys. */
export const ALL_DOMAINS = [
    'spirituality',
    'relationships',
    'productivity',
    'health',
    'finance',
];