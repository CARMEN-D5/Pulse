/**
 * Social Interaction Log type definitions.
 */

export type InteractionType = "call" | "message" | "meetup" | "video" | "hangout";

export interface InteractionOption {
  type: InteractionType;
  label: string;
  emoji: string;
}

export const INTERACTION_OPTIONS: InteractionOption[] = [
  { type: "call", label: "Call", emoji: "📞" },
  { type: "message", label: "Message", emoji: "💬" },
  { type: "meetup", label: "Meet-up", emoji: "☕" },
  { type: "video", label: "Video Call", emoji: "📹" },
  { type: "hangout", label: "Hangout", emoji: "🎉" },
];

export interface SocialLogEntry {
  id: string;
  contactName: string;
  interactionType: InteractionType;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

/** A known contact derived from past interactions */
export interface KnownContact {
  name: string;
  lastInteractionDate: string; // YYYY-MM-DD
  totalInteractions: number;
}

/** A friendship reminder for contacts not seen recently */
export interface FriendshipReminder {
  contactName: string;
  daysSinceContact: number;
  lastDate: string;
}
