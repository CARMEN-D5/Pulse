import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_LABELS, type DomainKey } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingPicker } from "@/components/ui/rating-picker";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { completeOnboarding } from "@/features/onboarding/services/onboarding-service";
import { getDeviceTimeZone } from "@/lib/date-time";
import { useProfile } from "@/providers/profile-provider";

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
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to complete onboarding right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Onboarding</Text>
        <Text style={styles.title}>Build your first VELORA baseline.</Text>
        <Text style={styles.copy}>
          These ratings give you a starting point for the first two weeks while the app collects real
          check-ins and actions.
        </Text>
      </View>

      <Card>
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
          <Text style={styles.domainTitle}>{DOMAIN_LABELS[domainKey]}</Text>
          <Text style={styles.domainCopy}>
            Rate where this area feels right now on a scale from 1 to 5.
          </Text>
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

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Button loading={isSubmitting} onPress={handleCompleteOnboarding}>
        Complete onboarding
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginBottom: 24
  },
  eyebrow: {
    color: "#8ba3ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36
  },
  copy: {
    color: "#b9c3de",
    fontSize: 16,
    lineHeight: 24
  },
  domainTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700"
  },
  domainCopy: {
    color: "#aeb9d4",
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  }
});
