/**
 * Journal type definitions.
 */

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  /** Optional guided prompt that inspired this entry */
  promptId: string | null;
  /** Optional mood tag */
  mood: JournalMood | null;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export type JournalMood = "great" | "good" | "okay" | "low" | "rough";

export interface JournalMoodOption {
  value: JournalMood;
  emoji: string;
  label: string;
}

export const JOURNAL_MOODS: JournalMoodOption[] = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "low", emoji: "😔", label: "Low" },
  { value: "rough", emoji: "😣", label: "Rough" },
];

export interface GuidedPrompt {
  id: string;
  text: string;
  category: "gratitude" | "reflection" | "growth" | "social" | "goals";
  emoji: string;
}

export const GUIDED_PROMPTS: GuidedPrompt[] = [
  { id: "p1", text: "What went well today?", category: "gratitude", emoji: "✨" },
  { id: "p2", text: "What's one thing you're grateful for?", category: "gratitude", emoji: "🙏" },
  { id: "p3", text: "What challenged you recently?", category: "reflection", emoji: "🤔" },
  { id: "p4", text: "What did you learn this week?", category: "growth", emoji: "📖" },
  { id: "p5", text: "Who made a positive impact on your day?", category: "social", emoji: "💛" },
  { id: "p6", text: "What's one goal you're working toward?", category: "goals", emoji: "🎯" },
  { id: "p7", text: "What would you do differently today?", category: "reflection", emoji: "🔄" },
  { id: "p8", text: "What are you looking forward to?", category: "goals", emoji: "🌟" },
];
