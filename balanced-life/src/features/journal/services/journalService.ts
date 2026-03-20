/**
 * Journal Service — Firestore CRUD for journal entries.
 * Collection: users/{uid}/journal/{id}
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../config/firebase";
import { JournalEntry, JournalMood } from "../types/journal.types";

function journalCollection(userId: string) {
  return collection(db, "users", userId, "journal");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Create entry ──

export async function createJournalEntry(
  userId: string,
  title: string,
  body: string,
  promptId: string | null,
  mood: JournalMood | null
): Promise<JournalEntry> {
  const now = new Date();
  const entry: Omit<JournalEntry, "id"> = {
    title: title.trim(),
    body: body.trim(),
    promptId,
    mood,
    date: todayStr(),
    createdAt: now.toISOString(),
  };

  const ref = await addDoc(journalCollection(userId), entry);
  return { id: ref.id, ...entry };
}

// ── Fetch entries ──

export async function fetchJournalEntries(
  userId: string,
  count: number = 30
): Promise<JournalEntry[]> {
  const q = query(
    journalCollection(userId),
    orderBy("createdAt", "desc"),
    limit(count)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry));
}

// ── Helpers ──

/** Format YYYY-MM-DD to readable string */
export function formatJournalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (dateStr === todayStr()) return "Today";
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
    return "Yesterday";

  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
