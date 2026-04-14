import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, type DomainKey } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainBadge } from "@/components/ui/domain-badge";
import { RatingPicker } from "@/components/ui/rating-picker";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusCard } from "@/components/ui/status-card";
import { TextField } from "@/components/ui/text-field";
import { completeOnboarding } from "@/features/onboarding/services/onboarding-service";
import { getDeviceTimeZone } from "@/lib/date-time";
import { toHelpfulErrorMessage } from "@/lib/errors";
import { useProfile } from "@/providers/profile-provider";
import { theme } from "@/theme/tokens";

type RatingsState = Partial<Record<DomainKey, number>>;

export function OnboardingScreen() {
  const { refreshProfile } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [scoringTimezone, setScoringTimezone] = useState(getDeviceTimeZone());
  const [ratings, setRatings] = useState<RatingsState>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const missingDomains = useMemo(
    () => DOMAIN_KEYS.filter((domainKey) => !ratings[domainKey]),
    [ratings]
  );
  const completedCount = DOMAIN_KEYS.length - missingDomains.length;

  async function handleCompleteOnboarding() {
    if (!scoringTimezone.trim()) {
      setErrorMessage("A scoring timezone is required.");
      return;
    }

    if (missingDomains.length > 0) {
      setErrorMessage("Rate all five domains before finishing onboarding.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      await completeOnboarding({
        displayName,
        initialRatings: DOMAIN_KEYS.reduce<Record<DomainKey, number>>((nextRatings, domainKey) => {
          nextRatings[domainKey] = ratings[domainKey] ?? 3;
          return nextRatings;
        }, {} as Record<DomainKey, number>),
        scoringTimezone: scoringTimezone.trim()
      });

      await refreshProfile();
      router.replace("/(app)/(tabs)/home");
    } catch (error) {
      setErrorMessage(toHelpfulErrorMessage(error, "Unable to complete onboarding right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen scrollable>
      <SectionHeader
        eyebrow="Personalized Growth"
        subtitle="These starting ratings guide your first two weeks while VELORA gathers real check-ins and actions."
        title="Build your first baseline."
      />

      <Card variant="highlight">
        <Text style={styles.progressLabel}>Baseline progress</Text>
        <Text style={styles.progressValue}>{completedCount}/5 areas rated</Text>
        <Text style={styles.progressCopy}>
          Start with your best estimate for each area. Your weekly picture will become more personal
          as real check-ins and actions build up.
        </Text>
        <TextField
          autoCapitalize="words"
          label="Display name"
          onChangeText={setDisplayName}
          placeholder="What should VELORA call you?"
          value={displayName}
        />
        <TextField
          autoCapitalize="none"
          helperText="Use an IANA timezone like Australia/Sydney or America/New_York."
          label="Scoring timezone"
          onChangeText={setScoringTimezone}
          placeholder="Australia/Sydney"
          value={scoringTimezone}
        />
      </Card>

      {DOMAIN_KEYS.map((domainKey) => (
        <Card key={domainKey}>
          <View style={styles.domainHeader}>
            <View style={styles.domainTopRow}>
              <DomainBadge domainKey={domainKey} />
              <View
                style={[
                  styles.ratingPill,
                  ratings[domainKey] ? styles.ratingPillSelected : null
                ]}
              >
                <Text
                  style={[
                    styles.ratingPillText,
                    ratings[domainKey] ? styles.ratingPillTextSelected : null
                  ]}
                >
                  {ratings[domainKey] ? `${ratings[domainKey]}/5` : "Not rated"}
                </Text>
              </View>
            </View>
            <Text style={styles.domainCopy}>
              Rate where this area feels right now on a scale from 1 to 5.
            </Text>
          </View>
          <RatingPicker
            onChange={(ratingValue) =>
              setRatings((currentState) => ({
                ...currentState,
                [domainKey]: ratingValue
              }))
            }
            value={ratings[domainKey] ?? null}
          />
        </Card>
      ))}

      {errorMessage ? (
        <StatusCard message={errorMessage} title="Onboarding not saved" tone="error" />
      ) : null}
      <Button loading={isSubmitting} onPress={handleCompleteOnboarding}>
        Complete onboarding
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  progressValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "800"
  },
  progressCopy: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  domainHeader: {
    gap: 8
  },
  domainTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  domainCopy: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  },
  ratingPill: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderMuted,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  ratingPillSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  ratingPillText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700"
  },
  ratingPillTextSelected: {
    color: theme.colors.primary
  }
});
