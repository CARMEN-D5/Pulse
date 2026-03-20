/**
 * Notification Service
 *
 * Handles scheduling/cancelling local push notifications and
 * persisting user notification preferences to Firestore.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_CHANNELS,
} from "../types/notification.types";

// ── Notification handler (how notifications appear when app is in foreground) ──

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Notification identifiers for cancellation ──

const DAILY_REMINDER_ID = "daily-checkin-reminder";
const WEEKLY_REVIEW_ID = "weekly-review-reminder";

// ── Permission & token ──

/**
 * Request notification permissions and return Expo push token.
 * Returns null if permissions denied or not a physical device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission not granted.");
    return null;
  }

  // Set up Android notification channels
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DAILY_REMINDER, {
      name: "Daily Check-in Reminder",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.WEEKLY_REVIEW, {
      name: "Weekly Review",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ACHIEVEMENTS, {
      name: "Achievements",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    console.log("Failed to get push token.");
    return null;
  }
}

// ── Firestore persistence ──

/**
 * Load notification settings from Firestore.
 * Returns defaults if no settings exist.
 */
export async function loadNotificationSettings(
  userId: string
): Promise<NotificationSettings> {
  const snap = await getDoc(doc(db, "users", userId, "settings", "notifications"));
  if (snap.exists()) {
    return snap.data() as NotificationSettings;
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

/**
 * Save notification settings to Firestore and reschedule notifications.
 */
export async function saveNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  await setDoc(doc(db, "users", userId, "settings", "notifications"), settings);
  await scheduleAllNotifications(settings);
}

/**
 * Save Expo push token to user profile for future server-side push.
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  await setDoc(doc(db, "users", userId, "settings", "pushToken"), { token, updatedAt: new Date().toISOString() });
}

// ── Scheduling ──

/**
 * Cancel all scheduled notifications and reschedule based on settings.
 */
export async function scheduleAllNotifications(
  settings: NotificationSettings
): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.enabled) return;

  if (settings.dailyReminder.enabled) {
    await scheduleDailyReminder(settings.dailyReminder.hour, settings.dailyReminder.minute);
  }

  if (settings.weeklyReview.enabled) {
    await scheduleWeeklyReview(settings.weeklyReview.day, settings.weeklyReview.hour, settings.weeklyReview.minute);
  }
}

/**
 * Schedule a repeating daily check-in reminder.
 */
async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  const messages = [
    "Time to check in! How are your 5 life domains today?",
    "Your daily balance check-in is waiting for you!",
    "Quick check-in time — it only takes a minute!",
    "Keep your streak going! Tap to check in today.",
    "How's your balance today? Let's find out!",
  ];

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: "Daily Check-In",
      body: messages[Math.floor(Math.random() * messages.length)],
      data: { type: "daily-reminder", screen: "CheckIn" },
      ...(Platform.OS === "android" && {
        channelId: NOTIFICATION_CHANNELS.DAILY_REMINDER,
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Schedule a repeating weekly review reminder.
 */
async function scheduleWeeklyReview(
  weekday: number,
  hour: number,
  minute: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_REVIEW_ID,
    content: {
      title: "Weekly Review",
      body: "Your weekly review is ready! See how your week went.",
      data: { type: "weekly-review", screen: "WeeklyReview" },
      ...(Platform.OS === "android" && {
        channelId: NOTIFICATION_CHANNELS.WEEKLY_REVIEW,
      }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: weekday === 0 ? 1 : weekday + 1, // Expo uses 1=Sunday, 2=Monday, etc.
      hour,
      minute,
    },
  });
}

// ── Instant notifications (called from services) ──

/**
 * Send an instant notification for a streak milestone.
 */
export async function notifyStreakMilestone(streak: number): Promise<void> {
  const milestones: Record<number, string> = {
    3: "3-day streak! You're building momentum!",
    7: "One week streak! Consistency is key!",
    14: "Two weeks strong! Amazing dedication!",
    30: "30-day streak! You're unstoppable!",
    60: "60 days! You've built a true habit!",
    90: "90-day streak! Legendary commitment!",
  };

  const message = milestones[streak];
  if (!message) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 ${streak}-Day Streak!`,
      body: message,
      data: { type: "streak-milestone" },
      ...(Platform.OS === "android" && {
        channelId: NOTIFICATION_CHANNELS.ACHIEVEMENTS,
      }),
    },
    trigger: null, // Immediate
  });
}

/**
 * Send an instant notification for a badge unlock.
 */
export async function notifyBadgeUnlock(badgeName: string, badgeEmoji: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${badgeEmoji} Badge Unlocked!`,
      body: `You earned "${badgeName}"! Check your profile to see all badges.`,
      data: { type: "badge-unlock" },
      ...(Platform.OS === "android" && {
        channelId: NOTIFICATION_CHANNELS.ACHIEVEMENTS,
      }),
    },
    trigger: null, // Immediate
  });
}
