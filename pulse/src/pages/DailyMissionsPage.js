// Daily Missions as a stacked page, opened from the Tools menu on the
// Features tab. Home shows the same <DailyMissions> card inline; this wrapper
// just supplies the domain scores it needs and a back header.
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import { Loading, Screen, ScreenHeader } from "../components/ui";
import { computeCurrentScores } from "../firestore/scoring";
import { spacing } from "../theme";
import DailyMissions from "./DailyMissions";

function DailyMissionsPage({ user, userDoc, scoreVersion, onBack }) {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !userDoc) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    computeCurrentScores(user.uid, userDoc)
      .then((result) => {
        if (!cancelled) setScores(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, userDoc, scoreVersion]);

  return (
    <Screen contentContainerStyle={styles.screen} keyboardAvoiding={false}>
      <ScreenHeader title="Daily Missions" onBack={onBack} />

      {loading ? (
        <Loading label="Loading your missions…" style={styles.loading} />
      ) : (
        <DailyMissions user={user} domainScores={scores?.domainScores ?? {}} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingBottom: 40 },
  loading: { paddingVertical: 60 },
});

export default DailyMissionsPage;
