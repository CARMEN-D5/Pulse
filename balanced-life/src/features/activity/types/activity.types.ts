/**
 * Activity Logger type definitions.
 */

export type ActivityType =
  | "walking"
  | "running"
  | "cycling"
  | "swimming"
  | "gym"
  | "yoga"
  | "sports"
  | "dancing"
  | "hiking"
  | "other";

export type Intensity = "light" | "moderate" | "intense";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  duration: number; // minutes
  intensity: Intensity;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO
}

export interface ActivityOption {
  type: ActivityType;
  label: string;
  emoji: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { type: "walking", label: "Walking", emoji: "🚶" },
  { type: "running", label: "Running", emoji: "🏃" },
  { type: "cycling", label: "Cycling", emoji: "🚴" },
  { type: "swimming", label: "Swimming", emoji: "🏊" },
  { type: "gym", label: "Gym", emoji: "🏋️" },
  { type: "yoga", label: "Yoga", emoji: "🧘" },
  { type: "sports", label: "Sports", emoji: "⚽" },
  { type: "dancing", label: "Dancing", emoji: "💃" },
  { type: "hiking", label: "Hiking", emoji: "🥾" },
  { type: "other", label: "Other", emoji: "🎯" },
];

export const INTENSITY_OPTIONS: { value: Intensity; label: string; emoji: string; color: string }[] = [
  { value: "light", label: "Light", emoji: "🟢", color: "#22C55E" },
  { value: "moderate", label: "Moderate", emoji: "🟡", color: "#F59E0B" },
  { value: "intense", label: "Intense", emoji: "🔴", color: "#EF4444" },
];

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
