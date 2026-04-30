export const DOMAINS = [
    {
        id: 'spirituality',
        name: 'Spirituality',
        focus: 'Presence, purpose, inner calm',
        icon:'🧘',
        questions: [
            'How fulfilled do you feel in your day-to-day life?',
        ],
    },
    {
        id: 'family_friends',
        name: 'Family & Friends',
        focus: 'Connection, relationships, support',
        icon: '💞',
        questions: [
            'How would do you find your relationships with friends and family?',
        ],
    },
    {
        id: 'work_productivity',
        name: 'Work / Productivity',
        focus: 'Focus, output, discipline',
        icon: '📈',
        questions: [
            'How difficult is it to meet deadlines and stay organised?',
        ],
    },
    {
        id: 'health',
        name: 'Health',
        focus: 'Physical + mental wellbeing',
        icon: '⚕️',
        questions: [
            'How would you rate your fitness and activity levels',
        ],
    },
    {
        id: 'financial',
        name: 'Financial',
        focus: 'Control, awareness, discipline',
        icon: '💸',
        questions: [
            'How would you rate your finances?',
        ],
    },
];

export const TOTAL_QUESTIONS = DOMAINS.reduce((sum, d) => sum + d.questions.length, 0);