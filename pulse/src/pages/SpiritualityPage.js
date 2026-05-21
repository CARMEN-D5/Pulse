import React, { useCallback, useMemo, useState } from "react";
import { MoodCheckInOverlay, JournalPromptOverlay, MoodDashboard } from "./MoodTracker";
import { todayKey, loadMoodData, saveMoodData } from "../data/spirituality";
import { logReflection, logAction } from "../firestore/scoring";

/**
 * Phase machine:
 *   "checkin"   — mood selection overlay (shown on first open today)
 *   "journal"   — journal prompt overlay (after mood selected)
 *   "dashboard" — main mood tracker view
 */
function SpiritualityPage({ user, onBack, onActivityLogged }) {
    const uid = user?.uid;

    const [moodData, setMoodData] = useState(() => loadMoodData(uid));

    const alreadyLoggedToday = useMemo(() => {
        return !!(moodData[todayKey()]?.moodId);
    }, []); // intentionally only on mount

    const [phase, setPhase] = useState(alreadyLoggedToday ? "dashboard" : "checkin");
    const [pendingMoodId, setPendingMoodId] = useState(null);

    const persistMood = useCallback(
        (moodId, journalText, emotions = []) => {
            const next = {
                ...moodData,
                [todayKey()]: { moodId, journalText: journalText || "", emotions },
            };
            setMoodData(next);
            saveMoodData(uid, next);

            // Score: mood rating (1-5) counts as a reflection for spirituality
            if (uid) {
                logReflection(uid, 'spirituality', moodId);
                // Journal entry counts as a mindfulness action
                if (journalText && journalText.trim()) {
                    logAction(uid, 'spirituality', 'journal');
                }
                if (onActivityLogged) onActivityLogged();
            }
        },
        [moodData, uid, onActivityLogged]
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
                onSave={(text, emotions) => { persistMood(pendingMoodId, text, emotions); setPhase("dashboard"); }}
                onSkip={() => { if (pendingMoodId) persistMood(pendingMoodId, "", []); setPhase("dashboard"); }}
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