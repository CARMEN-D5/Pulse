import React, { useCallback, useMemo, useState } from "react";
import { MoodCheckInOverlay, JournalPromptOverlay, MoodDashboard } from "./MoodTracker";
import { todayKey, loadMoodData, saveMoodData } from "../data/spirituality";

/**
 * Phase machine:
 *   "checkin"   — mood selection overlay (shown on first open today)
 *   "journal"   — journal prompt overlay (after mood selected)
 *   "dashboard" — main mood tracker view
 */
function SpiritualityPage({ user, onBack }) {
    const uid = user?.uid;

    const [moodData, setMoodData] = useState(() => loadMoodData(uid));

    const alreadyLoggedToday = useMemo(() => {
        return !!(moodData[todayKey()]?.moodId);
    }, []); // intentionally only on mount

    const [phase, setPhase] = useState(alreadyLoggedToday ? "dashboard" : "checkin");
    const [pendingMoodId, setPendingMoodId] = useState(null);

    const persistMood = useCallback(
        (moodId, journalText) => {
            const next = {
                ...moodData,
                [todayKey()]: { moodId, journalText: journalText || "" },
            };
            setMoodData(next);
            saveMoodData(uid, next);
        },
        [moodData, uid]
    );

    if (phase === "checkin") {
        return (
            <MoodCheckInOverlay
                onSelect={(moodId) => { setPendingMoodId(moodId); setPhase("journal"); }}
                onSkip={() => setPhase("dashboard")}
            />
        );
    }

    if (phase === "journal") {
        return (
            <JournalPromptOverlay
                moodId={pendingMoodId}
                onSave={(text) => { persistMood(pendingMoodId, text); setPhase("dashboard"); }}
                onSkip={() => { if (pendingMoodId) persistMood(pendingMoodId, ""); setPhase("dashboard"); }}
            />
        );
    }

    return (
        <MoodDashboard
            uid={uid}
            moodData={moodData}
            onLogNewMood={() => setPhase("checkin")}
            onBack={onBack}
        />
    );
}

export default SpiritualityPage;