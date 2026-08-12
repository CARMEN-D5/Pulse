import React, { useCallback, useEffect, useState } from "react";

import { Loading, Screen } from "../components/ui";
import { loadMoodData, saveMoodData, todayKey } from "../data/spirituality";
import { logAction, logReflection } from "../firestore/scoring";
import { JournalPromptOverlay, MoodCheckInOverlay, MoodDashboard } from "./MoodTracker";

/**
 * Phase machine:
 *   "loading"   — reading cached mood entries (AsyncStorage is async)
 *   "checkin"   — mood selection overlay (shown on first open today)
 *   "journal"   — journal prompt overlay (after mood selected)
 *   "dashboard" — main mood tracker view
 */
function SpiritualityPage({ user, onBack, onActivityLogged }) {
  const uid = user?.uid;

  const [moodData, setMoodData] = useState({});
  // The web build read localStorage synchronously in a useState initialiser.
  // AsyncStorage cannot do that, so the first render shows a spinner and the
  // opening phase is decided once the read resolves.
  const [phase, setPhase] = useState("loading");
  const [pendingMoodId, setPendingMoodId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadMoodData(uid).then((data) => {
      if (cancelled) return;
      setMoodData(data);
      setPhase(data[todayKey()]?.moodId ? "dashboard" : "checkin");
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

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
        logReflection(uid, "spirituality", moodId);
        // Journal entry counts as a mindfulness action
        if (journalText && journalText.trim()) {
          logAction(uid, "spirituality", "journal");
        }
        if (onActivityLogged) onActivityLogged();
      }
    },
    [moodData, uid, onActivityLogged]
  );

  if (phase === "loading") {
    return (
      <Screen scroll={false} center keyboardAvoiding={false}>
        <Loading label="Loading your check-ins…" />
      </Screen>
    );
  }

  if (phase === "checkin") {
    return (
      <MoodCheckInOverlay
        onSelect={(moodId) => {
          setPendingMoodId(moodId);
          setPhase("journal");
        }}
        onSkip={() => setPhase("dashboard")}
      />
    );
  }

  if (phase === "journal") {
    return (
      <JournalPromptOverlay
        moodId={pendingMoodId}
        onSave={(text, emotions) => {
          persistMood(pendingMoodId, text, emotions);
          setPhase("dashboard");
        }}
        onSkip={() => {
          if (pendingMoodId) persistMood(pendingMoodId, "", []);
          setPhase("dashboard");
        }}
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
