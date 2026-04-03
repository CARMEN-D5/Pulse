import { type DomainKey } from "@velora/shared";

import { supabase } from "@/lib/supabase/client";

type DailyCheckinRow = {
  created_at: string;
  domain_key: DomainKey;
  id: string;
  local_event_date: string;
  occurred_at_utc: string;
  rating_score: number;
  rating_value: number;
  updated_at: string;
  user_id: string;
  week_start_local_date: string;
};

export type DailyCheckin = {
  createdAt: string;
  domainKey: DomainKey;
  id: string;
  localEventDate: string;
  occurredAtUtc: string;
  ratingScore: number;
  ratingValue: number;
  updatedAt: string;
  weekStartLocalDate: string;
};

function mapDailyCheckin(row: DailyCheckinRow): DailyCheckin {
  return {
    createdAt: row.created_at,
    domainKey: row.domain_key,
    id: row.id,
    localEventDate: row.local_event_date,
    occurredAtUtc: row.occurred_at_utc,
    ratingScore: Number(row.rating_score),
    ratingValue: row.rating_value,
    updatedAt: row.updated_at,
    weekStartLocalDate: row.week_start_local_date
  };
}

export async function fetchDailyCheckinsForLocalDate(userId: string, localEventDate: string) {
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("local_event_date", localEventDate)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDailyCheckin(row as DailyCheckinRow));
}

export async function submitDailyCheckin(domainKey: DomainKey, ratingValue: number) {
  const { data, error } = await supabase.rpc("submit_daily_checkin", {
    p_domain_key: domainKey,
    p_rating_value: ratingValue
  });

  if (error) {
    throw error;
  }

  return data;
}
