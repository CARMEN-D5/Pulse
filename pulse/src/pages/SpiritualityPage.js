import React, { useCallback, useEffect, useState } from "react";

import { Loading, Screen } from "../components/ui";
import { loadMoodData, saveMoodData, todayKey } from "../data/spirituality";
import { logAction, logReflection } from "../firestore/scoring";
import { JournalPromptOverlay, MoodCheckInOverlay, MoodDashboard } from "./MoodTracker";
import { useSharePrompt } from "../components/share";
import { useTutorial } from "../tutorial";

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
  const [needsCheckin, setNeedsCheckin] = useState(false);

  const startCheckin = useCallback(() => {
    if (!needsCheckin) return;
    setNeedsCheckin(false);
    setPhase("checkin");
  }, [needsCheckin]);

  const journalTutorial = useTutorial("journal", {
    enabled: Boolean(uid && phase === "dashboard"),
    actions: { startCheckin },
  });

  const { openSharePrompt } = useSharePrompt();

  useEffect(() => {
    let cancelled = false;
    loadMoodData(uid).then((data) => {
      if (cancelled) return;
      setMoodData(data);
      const missingToday = !data[todayKey()]?.moodId;
      setNeedsCheckin(missingToday);
      setPhase("dashboard");
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (phase === "dashboard" && needsCheckin && journalTutorial.handled && !journalTutorial.active) {
      startCheckin();
    }
  }, [journalTutorial.active, journalTutorial.handled, needsCheckin, phase, startCheckin]);

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

  const handleJournalSave = (text, emotions) => {
    persistMood(pendingMoodId, text, emotions);

    if (text.trim() || emotions.length > 0) {
      openSharePrompt(
        "journal",
        {
          key: todayKey(),
          moodId: pendingMoodId,
          journalText: text,
          emotions,
        },
        { source: "auto" }
      );
    }

    setPhase("dashboard");
  };

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
        onSave={handleJournalSave}
        // no prompt created after skip is chosen
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
