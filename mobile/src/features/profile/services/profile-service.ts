import { supabase } from "@/lib/supabase/client";

type ProfileRow = {
  created_at: string;
  current_streak_days: number;
  display_name: string | null;
  id: string;
  onboarding_completed_at: string | null;
  scoring_timezone: string | null;
  updated_at: string;
};

export type Profile = {
  createdAt: string;
  currentStreakDays: number;
  displayName: string | null;
  id: string;
  onboardingCompletedAt: string | null;
  scoringTimezone: string | null;
  updatedAt: string;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    createdAt: row.created_at,
    currentStreakDays: row.current_streak_days,
    displayName: row.display_name,
    id: row.id,
    onboardingCompletedAt: row.onboarding_completed_at,
    scoringTimezone: row.scoring_timezone,
    updatedAt: row.updated_at
  };
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfile(data as ProfileRow) : null;
}
