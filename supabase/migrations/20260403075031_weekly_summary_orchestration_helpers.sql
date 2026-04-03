create or replace function public.upsert_previous_closed_weekly_life_summary_for_user(
  p_user_id uuid,
  p_reference_utc timestamptz default timezone('utc', now())
)
returns public.weekly_life_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_current_local_date date;
  v_target_week_start date;
  v_signup_local_date date;
  v_summary_row public.weekly_life_summaries%rowtype;
begin
  select *
  into v_profile
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found for user %', p_user_id
      using errcode = 'P0001';
  end if;

  if v_profile.scoring_timezone is null then
    raise exception 'Profile scoring timezone is not configured'
      using errcode = 'P0001';
  end if;

  v_current_local_date := timezone(v_profile.scoring_timezone, p_reference_utc)::date;
  v_target_week_start := date_trunc('week', v_current_local_date::timestamp)::date - 7;
  v_signup_local_date := timezone(v_profile.scoring_timezone, v_profile.created_at)::date;

  if (v_target_week_start + 6) < v_signup_local_date then
    return null;
  end if;

  v_summary_row := public.upsert_weekly_life_summary(
    p_user_id,
    v_target_week_start
  );

  return v_summary_row;
end;
$$;

create or replace function public.run_previous_closed_weekly_life_summary_batch(
  p_reference_utc timestamptz default timezone('utc', now()),
  p_limit integer default 1000
)
returns table (
  user_id uuid,
  week_start_local_date date,
  balanced_life_score numeric,
  is_provisional boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_summary public.weekly_life_summaries%rowtype;
begin
  if p_limit < 1 then
    raise exception 'p_limit must be at least 1'
      using errcode = '22023';
  end if;

  for v_profile in
    select p.id
    from public.profiles p
    where p.scoring_timezone is not null
      and p.onboarding_completed_at is not null
    order by p.created_at asc
    limit p_limit
  loop
    v_summary := public.upsert_previous_closed_weekly_life_summary_for_user(
      v_profile.id,
      p_reference_utc
    );

    if v_summary.id is not null then
      user_id := v_summary.user_id;
      week_start_local_date := v_summary.week_start_local_date;
      balanced_life_score := v_summary.balanced_life_score;
      is_provisional := v_summary.is_provisional;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.upsert_previous_closed_weekly_life_summary_for_user(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.run_previous_closed_weekly_life_summary_batch(timestamptz, integer) from public, anon, authenticated;
