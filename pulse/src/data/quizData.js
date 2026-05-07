export const DOMAINS = [
    {
        id: 'spirituality',
        name: 'Spirituality',
        focus: 'Presence, purpose, inner calm',
        icon:'🧘',
        questions: [
            'How often do you take time to slow down, be present, and clear your mind?',
        ],
    },
    {
        id: 'family_friends',
        name: 'Family & Friends',
        focus: 'Connection, relationships, support',
        icon: '💞',
        questions: [
            'How often do you have meaningful, distraction-free time with people important to you?',
        ],
    },
    {
        id: 'work_productivity',
        name: 'Work / Productivity',
        focus: 'Focus, output, discipline',
        icon: '📈',
        questions: [
            'How consistent fo you complete the most important tasks in your day?',
        ],
    },
    {
        id: 'health',
        name: 'Health',
        focus: 'Physical + mental wellbeing',
        icon: '⚕️',
        questions: [
            'How consistently do you take care of your physical and mental wellbeing?',
        ],
    },
    {
        id: 'financial',
        name: 'Financial',
        focus: 'Control, awareness, discipline',
        icon: '💸',
        questions: [
            'How in control do you feel over your daily spending and financial decisions?',
        ],
    },
];

export const TOTAL_QUESTIONS = DOMAINS.reduce((sum, d) => sum + d.questions.length, 0);