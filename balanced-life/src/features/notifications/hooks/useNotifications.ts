/**
 * useNotifications hook
 *
 * Initialises push notifications on app start:
 * - Requests permissions
 * - Loads user settings from Firestore
 * - Schedules reminders
 * - Handles notification taps (deep linking to screens)
 */

import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from "../types/notification.types";
import {
  registerForPushNotifications,
  loadNotificationSettings,
  savePushToken,
  scheduleAllNotifications,
} from "../services/notificationService";

/**
 * Initialise notifications for the authenticated user.
 * Call once from a top-level component (e.g. DashboardScreen).
 */
export function useNotifications(userId: string | undefined) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    async function init() {
      // 1. Request permissions & get token
      const token = await registerForPushNotifications();
      if (mounted) {
        setPermissionGranted(token !== null);
      }
      if (token) {
        await savePushToken(userId!, token);
      }

      // 2. Load settings from Firestore
      const loaded = await loadNotificationSettings(userId!);
      if (mounted) {
        setSettings(loaded);
      }

      // 3. Schedule notifications
      await scheduleAllNotifications(loaded);
    }

    init();

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Could track notification receipt analytics here
    });

    // Listen for notification taps (background / killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Navigation handled by the component consuming this hook
    });

    return () => {
      mounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);

  return { settings, setSettings, permissionGranted };
}
