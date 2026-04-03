import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_LABELS, type DomainKey } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingPicker } from "@/components/ui/rating-picker";
import { Screen } from "@/components/ui/screen";
import {
  fetchDailyCheckinsForLocalDate,
  submitDailyCheckin,
  type DailyCheckin
} from "@/features/check-in/services/check-in-service";
import { getLocalDateInTimeZone } from "@/lib/date-time";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";

type RatingsState = Partial<Record<DomainKey, number>>;

export function CheckInScreen() {
  const { user } = useAuthSession();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [ratings, setRatings] = useState<RatingsState>({});

  const localDate = useMemo(() => {
    if (!profile?.scoringTimezone) {
      return null;
    }

    return getLocalDateInTimeZone(profile.scoringTimezone);
  }, [profile?.scoringTimezone]);

  useEffect(() => {
    let isMounted = true;

    async function loadCheckins() {
      if (!user?.id || !localDate) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const currentCheckins = await fetchDailyCheckinsForLocalDate(user.id, localDate);

        if (!isMounted) {
          return;
        }

        setCheckins(currentCheckins);
        setRatings(
          currentCheckins.reduce<RatingsState>((nextState, checkin) => {
            nextState[checkin.domainKey] = checkin.ratingValue;
            return nextState;
          }, {})
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load today’s check-ins.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCheckins();

    return () => {
      isMounted = false;
    };
  }, [localDate, user?.id]);

  async function handleSave() {
    if (!user?.id) {
      return;
    }

    const missingRatings = DOMAIN_KEYS.filter((domainKey) => !ratings[domainKey]);

    if (missingRatings.length > 0) {
      setErrorMessage("Select a rating for each domain before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      for (const domainKey of DOMAIN_KEYS) {
        const ratingValue = ratings[domainKey];

        if (!ratingValue) {
          continue;
        }

        await submitDailyCheckin(domainKey, ratingValue);
      }

      if (!localDate) {
        return;
      }

      const currentCheckins = await fetchDailyCheckinsForLocalDate(user.id, localDate);
      setCheckins(currentCheckins);
      setSuccessMessage("Today’s check-ins were saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the check-ins.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Daily Check-In</Text>
        <Text style={styles.title}>Capture how each life area feels today.</Text>
        <Text style={styles.copy}>
          Reflection feeds your weekly balance score. Missing days are ignored, so today’s signal is
          only about today.
        </Text>
        {localDate ? <Text style={styles.dateBadge}>Local scoring date: {localDate}</Text> : null}
      </View>

      {isLoading ? (
        <Card>
          <ActivityIndicator color="#8ba3ff" />
          <Text style={styles.helper}>Loading today’s check-ins...</Text>
        </Card>
      ) : null}

      {!isLoading
        ? DOMAIN_KEYS.map((domainKey) => {
            const existingEntry = checkins.find((checkin) => checkin.domainKey === domainKey);

            return (
              <Card key={domainKey}>
                <Text style={styles.cardTitle}>{DOMAIN_LABELS[domainKey]}</Text>
                <Text style={styles.helper}>
                  {existingEntry
                    ? `Saved today as ${existingEntry.ratingValue}/5. You can update it before the day ends.`
                    : "No check-in saved yet for today."}
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
            );
          })
        : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <Button disabled={isLoading} loading={isSaving} onPress={handleSave}>
        Save today&apos;s check-ins
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
    color: "#bcc6df",
    fontSize: 16,
    lineHeight: 24
  },
  dateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#131a25",
    borderColor: "#2c3548",
    borderRadius: 999,
    borderWidth: 1,
    color: "#dbe3fa",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700"
  },
  helper: {
    color: "#a7b2cd",
    fontSize: 14,
    lineHeight: 20
  },
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  },
  success: {
    color: "#a9f2c2",
    fontSize: 14,
    lineHeight: 20
  }
});
