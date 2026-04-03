import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { DOMAIN_KEYS, mapRatingValueToScore } from "@velora/shared";

initializeApp();

export const completeOnboarding = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to complete onboarding.");
  }

  return {
    ok: true,
    message: "Onboarding scaffold is ready for implementation.",
    supportedDomains: DOMAIN_KEYS
  };
});

export const submitDailyCheckin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to submit a daily check-in.");
  }

  const ratingValue = Number(request.data?.ratingValue ?? 0);

  if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    throw new HttpsError("invalid-argument", "ratingValue must be an integer from 1 to 5.");
  }

  return {
    ok: true,
    mappedScore: mapRatingValueToScore(ratingValue),
    message: "Daily check-in scaffold is ready for implementation."
  };
});

export const onJournalEntryCreated = onDocumentCreated(
  "users/{userId}/journalEntries/{entryId}",
  async (event) => {
    logger.info("Journal entry trigger scaffold invoked.", {
      path: event.document,
      params: event.params
    });
  }
);

export const finalizeWeeklyScores = onSchedule("0 * * * *", async () => {
  logger.info("Weekly score finalizer scaffold invoked.");
});
