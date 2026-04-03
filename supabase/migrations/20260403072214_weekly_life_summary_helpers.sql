create or replace function public.calculate_evenness_score(p_scores numeric[])
returns numeric
language sql
immutable
as $$
  select round(
    public.clamp_score_value(
      100 - (
        2 * coalesce(
          (
            select stddev_pop(score_value)
            from unnest(p_scores) as score_value
          ),
          0
        )
      )
    ),
    2
  );
$$;

create or replace function public.calculate_weekly_life_summary_data(
  p_user_id uuid,
  p_week_start_local_date date
)
returns table (
  week_start_local_date date,
  week_end_local_date date,
  life_strength numeric,
  evenness numeric,
  balanced_life_score numeric,
  strongest_domain_key text,
  weakest_domain_key text,
  is_provisional boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_end_local_date date;
  v_displayed_scores numeric[];
  v_life_strength numeric;
  v_evenness numeric;
  v_balanced_life_score numeric;
  v_strongest_domain_key text;
  v_weakest_domain_key text;
  v_is_provisional boolean;
  v_domain_count integer;
  v_domain_record record;
begin
  if extract(isodow from p_week_start_local_date) <> 1 then
    raise exception 'week_start_local_date must be a Monday'
      using errcode = '22023';
  end if;

  for v_domain_record in
    select d.key
    from public.domains d
    where d.is_active = true
    order by d.sort_order
  loop
    perform public.upsert_weekly_domain_summary(
      p_user_id,
      v_domain_record.key,
      p_week_start_local_date
    );
  end loop;

  select
    count(*)::integer,
    max(wds.week_end_local_date),
    array_agg(wds.displayed_score order by d.sort_order),
    bool_or(wds.is_provisional)
  into
    v_domain_count,
    v_week_end_local_date,
    v_displayed_scores,
    v_is_provisional
  from public.weekly_domain_summaries wds
  join public.domains d
    on d.key = wds.domain_key
  where wds.user_id = p_user_id
    and wds.week_start_local_date = p_week_start_local_date
    and d.is_active = true;

  if v_domain_count <> 5 then
    raise exception 'Expected 5 active domain summaries, found %', coalesce(v_domain_count, 0)
      using errcode = 'P0001';
  end if;

  select wds.domain_key
  into v_strongest_domain_key
  from public.weekly_domain_summaries wds
  join public.domains d
    on d.key = wds.domain_key
  where wds.user_id = p_user_id
    and wds.week_start_local_date = p_week_start_local_date
    and d.is_active = true
  order by wds.displayed_score desc, d.sort_order asc
  limit 1;

  select wds.domain_key
  into v_weakest_domain_key
  from public.weekly_domain_summaries wds
  join public.domains d
    on d.key = wds.domain_key
  where wds.user_id = p_user_id
    and wds.week_start_local_date = p_week_start_local_date
    and d.is_active = true
  order by wds.displayed_score asc, d.sort_order asc
  limit 1;

  v_life_strength := round(
    (
      select avg(score_value)
      from unnest(v_displayed_scores) as score_value
    )::numeric,
    2
  );

  v_evenness := public.calculate_evenness_score(v_displayed_scores);
  v_balanced_life_score := round(((0.5 * v_life_strength) + (0.5 * v_evenness))::numeric, 2);

  return query
  select
    p_week_start_local_date,
    v_week_end_local_date,
    v_life_strength,
    v_evenness,
    v_balanced_life_score,
    v_strongest_domain_key,
    v_weakest_domain_key,
    coalesce(v_is_provisional, false);
end;
$$;

create or replace function public.upsert_weekly_life_summary(
  p_user_id uuid,
  p_week_start_local_date date
)
returns public.weekly_life_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary_data record;
  v_summary_row public.weekly_life_summaries%rowtype;
begin
  select *
  into v_summary_data
  from public.calculate_weekly_life_summary_data(
    p_user_id,
    p_week_start_local_date
  );

  insert into public.weekly_life_summaries (
    user_id,
    week_start_local_date,
    week_end_local_date,
    life_strength,
    evenness,
    balanced_life_score,
    strongest_domain_key,
    weakest_domain_key,
    is_provisional,
    finalized_at
  )
  values (
    p_user_id,
    v_summary_data.week_start_local_date,
    v_summary_data.week_end_local_date,
    v_summary_data.life_strength,
    v_summary_data.evenness,
    v_summary_data.balanced_life_score,
    v_summary_data.strongest_domain_key,
    v_summary_data.weakest_domain_key,
    v_summary_data.is_provisional,
    case
      when v_summary_data.is_provisional then null
      else timezone('utc', now())
    end
  )
  on conflict (user_id, week_start_local_date)
  do update set
    week_end_local_date = excluded.week_end_local_date,
    life_strength = excluded.life_strength,
    evenness = excluded.evenness,
    balanced_life_score = excluded.balanced_life_score,
    strongest_domain_key = excluded.strongest_domain_key,
    weakest_domain_key = excluded.weakest_domain_key,
    is_provisional = excluded.is_provisional,
    finalized_at = excluded.finalized_at
  returning *
  into v_summary_row;

  return v_summary_row;
end;
$$;

revoke all on function public.calculate_weekly_life_summary_data(uuid, date) from public, anon, authenticated;
revoke all on function public.upsert_weekly_life_summary(uuid, date) from public, anon, authenticated;
