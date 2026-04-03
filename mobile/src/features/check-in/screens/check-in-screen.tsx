import { useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { DOMAIN_KEYS, DOMAIN_LABELS, type DomainKey } from "@velora/shared";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RatingPicker } from "@/components/ui/rating-picker";
import { Screen } from "@/components/ui/screen";
import { StatusCard } from "@/components/ui/status-card";
import {
  fetchDailyCheckinsForLocalDate,
  submitDailyCheckin,
  type DailyCheckin
} from "@/features/check-in/services/check-in-service";
import { getLocalDateInTimeZone } from "@/lib/date-time";
import { toHelpfulErrorMessage } from "@/lib/errors";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";
import { domainTheme, theme } from "@/theme/tokens";

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

  const completedCount = DOMAIN_KEYS.filter((domainKey) => Boolean(ratings[domainKey])).length;

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

        setErrorMessage(toHelpfulErrorMessage(error, "Unable to load today’s check-ins."));
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
      setErrorMessage(toHelpfulErrorMessage(error, "Unable to save the check-ins."));
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
          A quick daily reflection keeps your weekly score grounded in how life actually feels.
        </Text>
        {localDate ? <Text style={styles.dateBadge}>Local scoring date: {localDate}</Text> : null}
      </View>

      <Card variant="highlight">
        <Text style={styles.summaryLabel}>Today&apos;s progress</Text>
        <Text style={styles.summaryValue}>{completedCount}/5 domains rated</Text>
        <Text style={styles.helper}>
          Missing days are ignored, so you only need to answer for how today feels.
        </Text>
      </Card>

      {!localDate ? (
        <StatusCard
          message="Set your scoring timezone in onboarding or settings before using daily check-ins."
          title="Timezone required"
          tone="error"
        />
      ) : null}

      {isLoading ? (
        <StatusCard
          loading
          message="Pulling today’s saved check-ins from Supabase."
          title="Loading today’s check-ins"
          tone="info"
        />
      ) : null}

      {!isLoading
        ? DOMAIN_KEYS.map((domainKey) => {
            const existingEntry = checkins.find((checkin) => checkin.domainKey === domainKey);

            return (
              <Card key={domainKey}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.cardIcon,
                      { backgroundColor: domainTheme[domainKey].soft }
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={domainTheme[domainKey].accent}
                      name={domainTheme[domainKey].icon as never}
                      size={18}
                    />
                  </View>
                  <View style={styles.cardHeaderCopy}>
                    <Text style={styles.cardTitle}>{DOMAIN_LABELS[domainKey]}</Text>
                    <Text style={styles.helper}>
                      {existingEntry
                        ? `Saved today as ${existingEntry.ratingValue}/5. You can update it before the day ends.`
                        : "No check-in saved yet for today."}
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
            );
          })
        : null}

      {errorMessage ? <StatusCard message={errorMessage} title="Could not save check-ins" tone="error" /> : null}
      {successMessage ? (
        <StatusCard
          message={successMessage}
          title="Check-ins synced"
          tone="success"
        />
      ) : null}

      <Button disabled={isLoading} loading={isSaving} onPress={handleSave}>
        Save today&apos;s check-ins
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
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
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
  dateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(156, 235, 232, 0.34)",
    borderColor: "rgba(8, 106, 105, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  summaryLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "800"
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 4
  },
  cardIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  helper: {
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20
  }
});
