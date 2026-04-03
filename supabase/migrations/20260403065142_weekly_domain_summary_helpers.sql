create or replace function public.clamp_score_value(p_value numeric)
returns numeric
language sql
immutable
as $$
  select greatest(0::numeric, least(100::numeric, p_value));
$$;

create or replace function public.get_domain_weekly_action_target(p_domain_key text)
returns numeric
language plpgsql
immutable
as $$
begin
  case p_domain_key
    when 'spirituality' then
      return 200;
    when 'family_friends' then
      return 200;
    when 'work_productivity' then
      return 250;
    when 'health' then
      return 300;
    when 'financial_wellbeing' then
      return 200;
    else
      raise exception 'Unsupported domain key: %', p_domain_key
        using errcode = '22023';
  end case;
end;
$$;

create or replace function public.get_onboarding_blend_weights(p_account_age_days integer)
returns table (
  bootstrap_weight numeric,
  observed_weight numeric
)
language sql
immutable
as $$
  select
    case
      when p_account_age_days between 1 and 3 then 0.70
      when p_account_age_days between 4 and 7 then 0.40
      when p_account_age_days between 8 and 14 then 0.20
      else 0.00
    end as bootstrap_weight,
    case
      when p_account_age_days between 1 and 3 then 0.30
      when p_account_age_days between 4 and 7 then 0.60
      when p_account_age_days between 8 and 14 then 0.80
      else 1.00
    end as observed_weight;
$$;

create or replace function public.calculate_weekly_domain_summary_data(
  p_user_id uuid,
  p_domain_key text,
  p_week_start_local_date date
)
returns table (
  week_start_local_date date,
  week_end_local_date date,
  active_days_in_window integer,
  reflection_days_count integer,
  reflection_score numeric,
  action_points_earned integer,
  action_target_points numeric,
  action_score numeric,
  consistency_days_count integer,
  consistency_score numeric,
  current_computed_score numeric,
  blended_computed_score numeric,
  displayed_score numeric,
  bootstrap_weight_used numeric,
  observed_weight_used numeric,
  used_reflection_reweighting boolean,
  is_provisional boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_signup_local_date date;
  v_current_local_date date;
  v_evaluation_local_date date;
  v_week_end_local_date date;
  v_effective_window_start date;
  v_is_partial_signup_week boolean := false;
  v_is_current_open_week boolean := false;
  v_active_days integer;
  v_reflection_days_count integer := 0;
  v_reflection_score numeric;
  v_action_points_earned integer := 0;
  v_action_target_points numeric;
  v_action_score numeric;
  v_consistency_days_count integer := 0;
  v_consistency_score numeric;
  v_current_computed_score numeric;
  v_blended_computed_score numeric;
  v_displayed_score numeric;
  v_bootstrap_weight numeric;
  v_observed_weight numeric;
  v_used_reflection_reweighting boolean := false;
  v_previous_displayed_score numeric;
  v_initial_rating_score numeric;
  v_account_age_days integer;
begin
  if extract(isodow from p_week_start_local_date) <> 1 then
    raise exception 'week_start_local_date must be a Monday'
      using errcode = '22023';
  end if;

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

  v_signup_local_date := timezone(v_profile.scoring_timezone, v_profile.created_at)::date;
  v_current_local_date := timezone(v_profile.scoring_timezone, timezone('utc', now()))::date;
  v_week_end_local_date := p_week_start_local_date + 6;

  if v_week_end_local_date < v_signup_local_date then
    raise exception 'Cannot compute a weekly summary before the user signed up'
      using errcode = '22023';
  end if;

  v_effective_window_start := greatest(p_week_start_local_date, v_signup_local_date);
  v_is_partial_signup_week := v_signup_local_date > p_week_start_local_date
    and v_signup_local_date <= v_week_end_local_date;
  v_is_current_open_week := v_current_local_date < v_week_end_local_date;
  v_active_days := (v_week_end_local_date - v_effective_window_start + 1);
  v_evaluation_local_date := least(v_current_local_date, v_week_end_local_date);

  if v_active_days < 1 or v_active_days > 7 then
    raise exception 'Computed active_days_in_window % is outside expected bounds', v_active_days
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    round(avg(dc.rating_score)::numeric, 2)
  into
    v_reflection_days_count,
    v_reflection_score
  from public.daily_checkins dc
  where dc.user_id = p_user_id
    and dc.domain_key = p_domain_key
    and dc.local_event_date between v_effective_window_start and v_week_end_local_date;

  v_consistency_days_count := v_reflection_days_count;

  select
    coalesce(sum(ae.awarded_points), 0)::integer
  into
    v_action_points_earned
  from public.action_events ae
  where ae.user_id = p_user_id
    and ae.domain_key = p_domain_key
    and ae.validation_status = 'accepted'
    and ae.local_event_date between v_effective_window_start and v_week_end_local_date;

  v_action_target_points := round(
    (
      public.get_domain_weekly_action_target(p_domain_key)
      * v_active_days::numeric
      / 7.0
    )::numeric,
    2
  );

  v_action_score := round(
    public.clamp_score_value(
      (v_action_points_earned::numeric / v_action_target_points) * 100
    ),
    2
  );

  v_consistency_score := round(
    public.clamp_score_value(
      (v_consistency_days_count::numeric / v_active_days::numeric) * 100
    ),
    2
  );

  if v_reflection_score is null then
    v_used_reflection_reweighting := true;
    v_current_computed_score := round(
      public.clamp_score_value(
        ((0.4 * v_action_score) + (0.3 * v_consistency_score)) / 0.7
      ),
      2
    );
  else
    v_current_computed_score := round(
      public.clamp_score_value(
        (0.3 * v_reflection_score) + (0.4 * v_action_score) + (0.3 * v_consistency_score)
      ),
      2
    );
  end if;

  v_account_age_days := (v_evaluation_local_date - v_signup_local_date + 1);

  select
    w.bootstrap_weight,
    w.observed_weight
  into
    v_bootstrap_weight,
    v_observed_weight
  from public.get_onboarding_blend_weights(v_account_age_days) w;

  if v_bootstrap_weight > 0 then
    select db.initial_rating_score
    into v_initial_rating_score
    from public.domain_baselines db
    where db.user_id = p_user_id
      and db.domain_key = p_domain_key;

    if v_initial_rating_score is null then
      raise exception 'Domain baseline missing for user % and domain %', p_user_id, p_domain_key
        using errcode = 'P0001';
    end if;

    v_blended_computed_score := round(
      public.clamp_score_value(
        (v_bootstrap_weight * v_initial_rating_score)
        + (v_observed_weight * v_current_computed_score)
      ),
      2
    );
  else
    v_blended_computed_score := v_current_computed_score;
  end if;

  select wds.displayed_score
  into v_previous_displayed_score
  from public.weekly_domain_summaries wds
  where wds.user_id = p_user_id
    and wds.domain_key = p_domain_key
    and wds.week_start_local_date = (p_week_start_local_date - 7);

  if v_previous_displayed_score is null then
    v_displayed_score := v_blended_computed_score;
  else
    v_displayed_score := round(
      public.clamp_score_value(
        (0.7 * v_previous_displayed_score) + (0.3 * v_blended_computed_score)
      ),
      2
    );
  end if;

  return query
  select
    p_week_start_local_date,
    v_week_end_local_date,
    v_active_days,
    v_reflection_days_count,
    v_reflection_score,
    v_action_points_earned,
    v_action_target_points,
    v_action_score,
    v_consistency_days_count,
    v_consistency_score,
    v_current_computed_score,
    v_blended_computed_score,
    v_displayed_score,
    v_bootstrap_weight,
    v_observed_weight,
    v_used_reflection_reweighting,
    (v_is_partial_signup_week or v_is_current_open_week);
end;
$$;

create or replace function public.upsert_weekly_domain_summary(
  p_user_id uuid,
  p_domain_key text,
  p_week_start_local_date date
)
returns public.weekly_domain_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary_data record;
  v_summary_row public.weekly_domain_summaries%rowtype;
begin
  select *
  into v_summary_data
  from public.calculate_weekly_domain_summary_data(
    p_user_id,
    p_domain_key,
    p_week_start_local_date
  );

  insert into public.weekly_domain_summaries (
    user_id,
    domain_key,
    week_start_local_date,
    week_end_local_date,
    active_days_in_window,
    reflection_days_count,
    reflection_score,
    action_points_earned,
    action_target_points,
    action_score,
    consistency_days_count,
    consistency_score,
    current_computed_score,
    blended_computed_score,
    displayed_score,
    bootstrap_weight_used,
    observed_weight_used,
    used_reflection_reweighting,
    is_provisional,
    finalized_at
  )
  values (
    p_user_id,
    p_domain_key,
    v_summary_data.week_start_local_date,
    v_summary_data.week_end_local_date,
    v_summary_data.active_days_in_window,
    v_summary_data.reflection_days_count,
    v_summary_data.reflection_score,
    v_summary_data.action_points_earned,
    v_summary_data.action_target_points,
    v_summary_data.action_score,
    v_summary_data.consistency_days_count,
    v_summary_data.consistency_score,
    v_summary_data.current_computed_score,
    v_summary_data.blended_computed_score,
    v_summary_data.displayed_score,
    v_summary_data.bootstrap_weight_used,
    v_summary_data.observed_weight_used,
    v_summary_data.used_reflection_reweighting,
    v_summary_data.is_provisional,
    case
      when v_summary_data.is_provisional then null
      else timezone('utc', now())
    end
  )
  on conflict (user_id, domain_key, week_start_local_date)
  do update set
    week_end_local_date = excluded.week_end_local_date,
    active_days_in_window = excluded.active_days_in_window,
    reflection_days_count = excluded.reflection_days_count,
    reflection_score = excluded.reflection_score,
    action_points_earned = excluded.action_points_earned,
    action_target_points = excluded.action_target_points,
    action_score = excluded.action_score,
    consistency_days_count = excluded.consistency_days_count,
    consistency_score = excluded.consistency_score,
    current_computed_score = excluded.current_computed_score,
    blended_computed_score = excluded.blended_computed_score,
    displayed_score = excluded.displayed_score,
    bootstrap_weight_used = excluded.bootstrap_weight_used,
    observed_weight_used = excluded.observed_weight_used,
    used_reflection_reweighting = excluded.used_reflection_reweighting,
    is_provisional = excluded.is_provisional,
    finalized_at = excluded.finalized_at
  returning *
  into v_summary_row;

  return v_summary_row;
end;
$$;

revoke all on function public.calculate_weekly_domain_summary_data(uuid, text, date) from public, anon, authenticated;
revoke all on function public.upsert_weekly_domain_summary(uuid, text, date) from public, anon, authenticated;
