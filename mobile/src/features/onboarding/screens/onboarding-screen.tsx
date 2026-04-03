import { router } from "expo-router";
import { useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_LABELS, type DomainKey } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingPicker } from "@/components/ui/rating-picker";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import { TextField } from "@/components/ui/text-field";
import { completeOnboarding } from "@/features/onboarding/services/onboarding-service";
import { getDeviceTimeZone } from "@/lib/date-time";
import { toHelpfulErrorMessage } from "@/lib/errors";
import { useProfile } from "@/providers/profile-provider";
import { domainTheme, theme } from "@/theme/tokens";

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
      setErrorMessage(toHelpfulErrorMessage(error, "Unable to complete onboarding right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Personalized growth</Text>
        <Text style={styles.title}>Build your first VELORA baseline.</Text>
        <Text style={styles.copy}>
          These ratings give you a starting point for the first two weeks while the app collects real
          check-ins and actions.
        </Text>
      </View>

      <Card variant="highlight">
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
            <View
              style={[
                styles.domainIcon,
                { backgroundColor: domainTheme[domainKey].soft }
              ]}
            >
              <MaterialCommunityIcons
                color={domainTheme[domainKey].accent}
                name={domainTheme[domainKey].icon as never}
                size={18}
              />
            </View>
            <View style={styles.domainHeaderCopy}>
              <Text style={styles.domainTitle}>{DOMAIN_LABELS[domainKey]}</Text>
              <Text style={styles.domainCopy}>
                Rate where this area feels right now on a scale from 1 to 5.
              </Text>
            </View>
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
  hero: {
    gap: 12,
    marginBottom: 4
  },
  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(156, 235, 232, 0.42)",
    borderRadius: 999,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  copy: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24
  },
  domainHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  domainHeaderCopy: {
    flex: 1,
    gap: 4
  },
  domainIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  domainTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  domainCopy: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  }
});
