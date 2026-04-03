import { type DomainKey } from "@velora/shared";

import { supabase } from "@/lib/supabase/client";

type WeeklyLifeSummaryRow = {
  balanced_life_score: number;
  created_at: string;
  evenness: number;
  finalized_at: string | null;
  id: string;
  is_provisional: boolean;
  life_strength: number;
  strongest_domain_key: DomainKey | null;
  updated_at: string;
  user_id: string;
  week_end_local_date: string;
  week_start_local_date: string;
  weakest_domain_key: DomainKey | null;
};

type WeeklyDomainSummaryRow = {
  action_score: number;
  active_days_in_window: number;
  blended_computed_score: number | null;
  bootstrap_weight_used: number;
  consistency_days_count: number;
  consistency_score: number;
  created_at: string;
  current_computed_score: number;
  displayed_score: number;
  domain_key: DomainKey;
  finalized_at: string | null;
  id: string;
  is_provisional: boolean;
  observed_weight_used: number;
  reflection_days_count: number;
  reflection_score: number | null;
  updated_at: string;
  user_id: string;
  week_end_local_date: string;
  week_start_local_date: string;
};

export type WeeklyLifeSummary = {
  balancedLifeScore: number;
  evenness: number;
  finalizedAt: string | null;
  lifeStrength: number;
  strongestDomainKey: DomainKey | null;
  isProvisional: boolean;
  weekEndLocalDate: string;
  weekStartLocalDate: string;
  weakestDomainKey: DomainKey | null;
};

export type WeeklyDomainSummary = {
  actionScore: number;
  activeDaysInWindow: number;
  blendedComputedScore: number | null;
  consistencyDaysCount: number;
  consistencyScore: number;
  currentComputedScore: number;
  displayedScore: number;
  domainKey: DomainKey;
  isProvisional: boolean;
  reflectionDaysCount: number;
  reflectionScore: number | null;
  weekEndLocalDate: string;
  weekStartLocalDate: string;
};

export type DashboardSnapshot = {
  domainSummaries: WeeklyDomainSummary[];
  lifeSummary: WeeklyLifeSummary | null;
  previousLifeSummary: WeeklyLifeSummary | null;
};

function mapWeeklyLifeSummary(row: WeeklyLifeSummaryRow): WeeklyLifeSummary {
  return {
    balancedLifeScore: Number(row.balanced_life_score),
    evenness: Number(row.evenness),
    finalizedAt: row.finalized_at,
    isProvisional: row.is_provisional,
    lifeStrength: Number(row.life_strength),
    strongestDomainKey: row.strongest_domain_key,
    weekEndLocalDate: row.week_end_local_date,
    weekStartLocalDate: row.week_start_local_date,
    weakestDomainKey: row.weakest_domain_key
  };
}

function mapWeeklyDomainSummary(row: WeeklyDomainSummaryRow): WeeklyDomainSummary {
  return {
    actionScore: Number(row.action_score),
    activeDaysInWindow: row.active_days_in_window,
    blendedComputedScore:
      row.blended_computed_score == null ? null : Number(row.blended_computed_score),
    consistencyDaysCount: row.consistency_days_count,
    consistencyScore: Number(row.consistency_score),
    currentComputedScore: Number(row.current_computed_score),
    displayedScore: Number(row.displayed_score),
    domainKey: row.domain_key,
    isProvisional: row.is_provisional,
    reflectionDaysCount: row.reflection_days_count,
    reflectionScore: row.reflection_score == null ? null : Number(row.reflection_score),
    weekEndLocalDate: row.week_end_local_date,
    weekStartLocalDate: row.week_start_local_date
  };
}

export async function fetchWeeklyLifeSummaries(userId: string, limit = 8) {
  const { data, error } = await supabase
    .from("weekly_life_summaries")
    .select("*")
    .eq("user_id", userId)
    .order("week_start_local_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapWeeklyLifeSummary(row as WeeklyLifeSummaryRow));
}

export async function fetchWeeklyDomainSummaries(userId: string, weekStartLocalDate: string) {
  const { data, error } = await supabase
    .from("weekly_domain_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_local_date", weekStartLocalDate)
    .order("domain_key", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapWeeklyDomainSummary(row as WeeklyDomainSummaryRow));
}

export async function fetchLatestDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const [lifeSummary, previousLifeSummary] = await fetchWeeklyLifeSummaries(userId, 2);

  if (!lifeSummary) {
    return {
      domainSummaries: [],
      lifeSummary: null,
      previousLifeSummary: null
    };
  }

  const domainSummaries = await fetchWeeklyDomainSummaries(userId, lifeSummary.weekStartLocalDate);

  return {
    domainSummaries,
    lifeSummary,
    previousLifeSummary: previousLifeSummary ?? null
  };
}
