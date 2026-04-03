create or replace function public.submit_daily_checkin(
  p_domain_key text,
  p_rating_value smallint,
  p_occurred_at_utc timestamptz default timezone('utc', now())
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_local_timestamp timestamp;
  v_local_event_date date;
  v_week_start_local_date date;
  v_rating_score numeric;
  v_checkin public.daily_checkins%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_rating_value is null or p_rating_value < 1 or p_rating_value > 5 then
    raise exception 'rating_value must be an integer from 1 to 5'
      using errcode = '22023';
  end if;

  if p_occurred_at_utc is null then
    raise exception 'occurred_at_utc is required'
      using errcode = '22023';
  end if;

  if p_occurred_at_utc > timezone('utc', now()) + interval '15 minutes' then
    raise exception 'occurred_at_utc cannot be unreasonably far in the future'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.domains d
    where d.key = p_domain_key
      and d.is_active = true
  ) then
    raise exception 'Unsupported or inactive domain key'
      using errcode = '22023';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found for authenticated user'
      using errcode = 'P0001';
  end if;

  if v_profile.onboarding_completed_at is null then
    raise exception 'Onboarding must be completed before submitting daily check-ins'
      using errcode = 'P0001';
  end if;

  if v_profile.scoring_timezone is null then
    raise exception 'Profile scoring timezone is not configured'
      using errcode = 'P0001';
  end if;

  v_rating_score := public.map_rating_value_to_score(p_rating_value);
  v_local_timestamp := timezone(v_profile.scoring_timezone, p_occurred_at_utc);
  v_local_event_date := v_local_timestamp::date;
  v_week_start_local_date := date_trunc('week', v_local_timestamp)::date;

  insert into public.daily_checkins (
    user_id,
    domain_key,
    rating_value,
    rating_score,
    occurred_at_utc,
    local_event_date,
    week_start_local_date
  )
  values (
    v_user_id,
    p_domain_key,
    p_rating_value,
    v_rating_score,
    p_occurred_at_utc,
    v_local_event_date,
    v_week_start_local_date
  )
  on conflict (user_id, domain_key, local_event_date)
  do update set
    rating_value = excluded.rating_value,
    rating_score = excluded.rating_score,
    occurred_at_utc = excluded.occurred_at_utc,
    week_start_local_date = excluded.week_start_local_date
  returning *
  into v_checkin;

  return jsonb_build_object(
    'ok', true,
    'id', v_checkin.id,
    'domain_key', v_checkin.domain_key,
    'rating_value', v_checkin.rating_value,
    'rating_score', v_checkin.rating_score,
    'local_event_date', v_checkin.local_event_date,
    'week_start_local_date', v_checkin.week_start_local_date
  );
end;
$$;

revoke all on function public.submit_daily_checkin(text, smallint, timestamptz) from public;
revoke all on function public.submit_daily_checkin(text, smallint, timestamptz) from anon;
grant execute on function public.submit_daily_checkin(text, smallint, timestamptz) to authenticated;
