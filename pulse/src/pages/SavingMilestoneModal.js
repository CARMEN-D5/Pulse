import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";

import SavingModalShell from "./SavingModalShell";
import { PrimaryButton } from "../components/ui";
import { colors, fonts, spacing, type } from "../theme";

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;

function milestoneCopy(event) {
  if (event.milestone === 25) return { emoji: "🌱", lead: "Great start!", tail: "Keep it going!" };
  if (event.milestone === 50)
    return {
      emoji: "🎉",
      lead: "Amazing work!",
      tail: event.actualProgress > 50 ? "You're past the halfway mark!" : "You're halfway there!",
    };
  if (event.milestone === 75)
    return {
      emoji: "💪",
      lead: "Your consistency is paying off!",
      tail: "Keep going — you're getting really close.",
    };
  return { emoji: "🚀", lead: "So close!", tail: "You're almost there!" };
}

export default function SavingMilestoneModal({ event, onClose, onComplete }) {
  const [completing, setCompleting] = useState(false);
  if (!event) return null;

  if (event.type === "completed") {
    return (
      // Completing is a one-way action, so this one does not dismiss on a
      // stray backdrop tap.
      <SavingModalShell
        title="Goal completed!"
        onClose={onClose}
        dismissOnBackdrop={false}
        footer={
          <PrimaryButton
            label={completing ? "Completing…" : "Awesome!"}
            disabled={completing}
            loading={completing}
            onPress={async () => {
              setCompleting(true);
              const completed = await onComplete(event);
              if (!completed) setCompleting(false);
            }}
            style={styles.flex}
          />
        }
      >
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.lead}>Congratulations!</Text>
        <Text style={styles.body}>
          You've successfully reached your saving goal for{" "}
          <Text style={styles.strong}>{event.planName}</Text>.
        </Text>
        <Text style={styles.body}>
          You saved <Text style={styles.strong}>{money(event.savedAmount)}</Text> toward your goal
          of <Text style={styles.strong}>{money(event.targetAmount)}</Text>.
        </Text>
        <Text style={styles.body}>Amazing work — enjoy the achievement!</Text>
      </SavingModalShell>
    );
  }

  const copy = milestoneCopy(event);
  return (
    <SavingModalShell
      title="You're making progress!"
      onClose={onClose}
      footer={<PrimaryButton label="Continue" onPress={onClose} style={styles.flex} />}
    >
      <Text style={styles.emoji}>{copy.emoji}</Text>
      <Text style={styles.lead}>{copy.lead}</Text>
      <Text style={styles.body}>
        You're now <Text style={styles.strong}>{event.actualProgress}%</Text> of the way to{" "}
        <Text style={styles.strong}>{event.planName}</Text>.
      </Text>
      <Text style={styles.body}>{copy.tail}</Text>
    </SavingModalShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  emoji: { fontSize: 44, textAlign: "center", marginBottom: spacing.xs },
  lead: { ...type.title, fontFamily: fonts.bold, color: colors.text, textAlign: "center" },
  body: { ...type.body, color: colors.textMuted, textAlign: "center" },
  strong: { fontFamily: fonts.semibold, color: colors.text },
});
