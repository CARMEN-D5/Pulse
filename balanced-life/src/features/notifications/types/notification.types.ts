/**
 * Push Notification type definitions.
 *
 * Covers user preferences for daily check-in reminders,
 * weekly review reminders, and milestone alerts.
 */

export interface NotificationSettings {
  /** Master toggle — disables all notifications when false */
  enabled: boolean;
  /** Daily check-in reminder */
  dailyReminder: {
    enabled: boolean;
    /** Hour in 24h format (0–23) */
    hour: number;
    /** Minute (0–59) */
    minute: number;
  };
  /** Weekly review reminder (Sunday evening) */
  weeklyReview: {
    enabled: boolean;
    /** Day of week: 0 = Sunday, 1 = Monday, …, 6 = Saturday */
    day: number;
    hour: number;
    minute: number;
  };
  /** Streak milestone celebration notifications */
  streakMilestones: boolean;
  /** Badge unlock notifications */
  badgeUnlocks: boolean;
}

/** Notification channel IDs for Android */
export const NOTIFICATION_CHANNELS = {
  DAILY_REMINDER: "daily-reminder",
  WEEKLY_REVIEW: "weekly-review",
  ACHIEVEMENTS: "achievements",
} as const;

/** Default notification settings for new users */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminder: {
    enabled: true,
    hour: 9,
    minute: 0,
  },
  weeklyReview: {
    enabled: true,
    day: 0, // Sunday
    hour: 18,
    minute: 0,
  },
  streakMilestones: true,
  badgeUnlocks: true,
};
