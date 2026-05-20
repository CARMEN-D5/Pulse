/*
all of the const and helper functions for hte spirituality page
will be kept here
 */

// const

export const MOODS = [
    { id: 1, label: "Awful", color: "#6B8ECC", bg: "rgba(107,142,204,0.12)", textColor: "#2C4A7A"},
    { id: 2, label: "Bad", color: "#81B3D2", bg: "rgba(129,179,210,0.12)", textColor: "#2A5570"},
    { id: 3, label: "Okay", color: "#D4A843", bg: "rgba(212,168,67,0.12)", textColor: "#7A5C10"},
    { id: 4, label: "Good", color: "#82C272", bg: "rgba(130,194,114,0.12)", textColor: "#2E6520"},
    { id: 5, label: "Amazing", color: "#4BAD7A", bg: "rgba(75,173,122,0.12)", textColor: "#1A5C3A"}
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

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const FACE_EXPRESSIONS = {
    1: { browL: "M14,15 Q18,11 22,15", browR: "M26,15 Q30,11 34,15", mouth: "M16,26 Q24,21 32,26" },
    2: { browL: "M14,15 Q18,12 22,15", browR: "M26,15 Q30,12 34,15", mouth: "M16,25 Q24,22 32,25" },
    3: { browL: "M14,16 Q18,14 22,16", browR: "M26,16 Q30,14 34,16", mouth: "M16,25 L32,25" },
    4: { browL: "M14,16 Q18,18 22,15", browR: "M26,15 Q30,18 34,16", mouth: "M15,24 Q24,30 33,24" },
    5: { browL: "M13,16 Q18,20 22,14", browR: "M26,14 Q30,20 35,16", mouth: "M13,23 Q24,32 35,23" },
};

// helper functions

export function todayKey() {
    const d = new Date();
    return '${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}';
}

export function getTimeofDay() {
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

export function buildWeekData(moodData) {
    const days = [];
    for (let i = 6; i >=0; i --) {
        const d = newDate();
        d.setDate(d.getDate() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({
            key: k,
            dayLabel: DAYS[d.getDay()],
            dateNum: d.getDate(),
            isToday: i === 0,
            ...(moodData[k] || {}),
        });
    }
    return days;
}


