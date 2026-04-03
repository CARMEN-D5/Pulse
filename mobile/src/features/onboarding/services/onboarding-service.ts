import { type DomainKey } from "@velora/shared";

import { supabase } from "@/lib/supabase/client";

export async function completeOnboarding(input: {
  displayName: string;
  initialRatings: Record<DomainKey, number>;
  scoringTimezone: string;
}) {
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_display_name: input.displayName,
    p_initial_ratings: input.initialRatings,
    p_scoring_timezone: input.scoringTimezone
  });

  if (error) {
    throw error;
  }

  return data;
}
