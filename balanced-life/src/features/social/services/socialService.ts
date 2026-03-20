/**
 * Social Service — CRUD for social interaction logs and friendship reminders.
 *
 * Collection: users/{uid}/socialLogs/{autoId}
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import {
  SocialLogEntry,
  InteractionType,
  KnownContact,
  FriendshipReminder,
} from "../types/social.types";

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Save a new social interaction */
export async function logSocialInteraction(
  userId: string,
  data: {
    contactName: string;
    interactionType: InteractionType;
    note: string;
  }
): Promise<SocialLogEntry> {
  const now = new Date();
  const entry = {
    contactName: data.contactName.trim(),
    interactionType: data.interactionType,
    note: data.note.trim(),
    date: formatDate(now),
    createdAt: now.toISOString(),
  };

  const ref = await addDoc(
    collection(db, "users", userId, "socialLogs"),
    entry
  );

  return { ...entry, id: ref.id };
}

/** Fetch recent social interactions (most recent first) */
export async function fetchRecentSocialLogs(
  userId: string,
  max: number = 30
): Promise<SocialLogEntry[]> {
  const q = query(
    collection(db, "users", userId, "socialLogs"),
    orderBy("createdAt", "desc"),
    limit(max)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialLogEntry));
}

/** Fetch social logs for a date range */
export async function fetchSocialLogsInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<SocialLogEntry[]> {
  const q = query(
    collection(db, "users", userId, "socialLogs"),
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialLogEntry));
}

/**
 * Build known contacts list from all interactions.
 * Groups by contact name, tracks last interaction date and count.
 */
export function buildKnownContacts(logs: SocialLogEntry[]): KnownContact[] {
  const map = new Map<string, KnownContact>();

  for (const log of logs) {
    const key = log.contactName.toLowerCase();
    const existing = map.get(key);

    if (!existing || log.date > existing.lastInteractionDate) {
      map.set(key, {
        name: log.contactName,
        lastInteractionDate: log.date,
        totalInteractions: (existing?.totalInteractions ?? 0) + 1,
      });
    } else {
      existing.totalInteractions += 1;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalInteractions - a.totalInteractions
  );
}

/**
 * Generate friendship reminders for contacts not seen in 7+ days.
 * Sorted by longest gap first.
 */
export function generateFriendshipReminders(
  knownContacts: KnownContact[]
): FriendshipReminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminders: FriendshipReminder[] = [];

  for (const contact of knownContacts) {
    const lastDate = new Date(contact.lastInteractionDate + "T00:00:00");
    const diffMs = today.getTime() - lastDate.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysSince >= 7) {
      reminders.push({
        contactName: contact.name,
        daysSinceContact: daysSince,
        lastDate: contact.lastInteractionDate,
      });
    }
  }

  return reminders.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}
