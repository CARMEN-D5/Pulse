// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MOODS = [
    { id: 1, label: "Awful",  color: "#6B8ECC", bg: "rgba(107,142,204,0.12)", textColor: "#2C4A7A" },
    { id: 2, label: "Bad",    color: "#81B3D2", bg: "rgba(129,179,210,0.12)", textColor: "#2A5570" },
    { id: 3, label: "Okay",   color: "#D4A843", bg: "rgba(212,168,67,0.12)",  textColor: "#7A5C10" },
    { id: 4, label: "Good",   color: "#82C272", bg: "rgba(130,194,114,0.12)", textColor: "#2E6520" },
    { id: 5, label: "Great",  color: "#4BAD7A", bg: "rgba(75,173,122,0.12)",  textColor: "#1A5C3A" },
];

export const JOURNAL_PROMPTS = [
    "What made today feel meaningful?",
    "What's one thing you're grateful for right now?",
    "Describe a moment today that felt peaceful.",
    "What's been weighing on your mind lately?",
    "What small win can you celebrate today?",
    "How did you take care of yourself today?",
    "What are you looking forward to tomorrow?",
];

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Emotion tags shown in the journal step, grouped by mood id.
export const MOOD_EMOTIONS = {
    1: ["depressed", "angry", "hopeless", "scared", "lonely", "down", "frustrated", "exhausted"],
    2: ["sad", "anxious", "disappointed", "restless", "worried", "tired", "stressed", "bored"],
    3: ["okay", "mellow", "calm", "balanced", "distracted", "uncertain", "neutral", "sleepy"],
    4: ["good", "relaxed", "proud", "optimistic", "thoughtful", "motivated", "cozy", "grateful"],
    5: ["happy", "excited", "joyful", "inspired", "loving", "energised", "confident", "peaceful"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
}

function storageKey(uid) {
    return `pulse_mood_${uid || "guest"}`;
}

export function loadMoodData(uid) {
    try {
        const raw = localStorage.getItem(storageKey(uid));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveMoodData(uid, data) {
    try {
        localStorage.setItem(storageKey(uid), JSON.stringify(data));
    } catch {}
}

// Returns the last 7 days as { key, dayLabel, dateNum, isToday, moodId?, journalText? }[]
export function buildWeekData(moodData) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({
            key: k,
            dayLabel: DAYS_SHORT[d.getDay()],
            dateNum: d.getDate(),
            isToday: i === 0,
            ...(moodData[k] || {}),
        });
    }
    return days;
}