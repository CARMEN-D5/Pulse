create type public.focus_session_status as enum (
  'in_progress',
  'completed',
  'cancelled'
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at_utc timestamptz not null default timezone('utc', now()),
  ended_at_utc timestamptz,
  duration_minutes integer,
  local_event_date date,
  status public.focus_session_status not null default 'in_progress',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (duration_minutes is null or duration_minutes >= 1),
  check (ended_at_utc is null or ended_at_utc > started_at_utc),
  check (
    (
      status = 'completed'
      and ended_at_utc is not null
      and duration_minutes is not null
      and local_event_date is not null
    )
    or (
      status <> 'completed'
      and ended_at_utc is null
      and duration_minutes is null
      and local_event_date is null
    )
  )
);

create trigger set_focus_sessions_updated_at
before update on public.focus_sessions
for each row
execute function public.set_updated_at();

create index focus_sessions_user_status_idx
on public.focus_sessions (user_id, status, updated_at desc);

create index focus_sessions_user_local_event_date_idx
on public.focus_sessions (user_id, local_event_date desc)
where local_event_date is not null;

create or replace function public.sync_focus_session_completion_fields()
returns trigger
language plpgsql
as $$
declare
  v_scoring_timezone text;
  v_duration_minutes integer;
begin
  if new.started_at_utc > timezone('utc', now()) + interval '15 minutes' then
    raise exception 'Focus session start time cannot be more than 15 minutes in the future'
      using errcode = '22023';
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' then
    if new.status <> 'completed' then
      raise exception 'Completed focus sessions cannot be marked incomplete'
        using errcode = 'P0001';
    end if;

    if new.started_at_utc is distinct from old.started_at_utc
      or new.ended_at_utc is distinct from old.ended_at_utc
      or new.duration_minutes is distinct from old.duration_minutes then
      raise exception 'Completed focus session timing cannot be changed once set'
        using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'completed' then
    if new.ended_at_utc is null then
      new.ended_at_utc := timezone('utc', now());
    end if;

    if new.ended_at_utc > timezone('utc', now()) + interval '15 minutes' then
      raise exception 'Focus session end time cannot be more than 15 minutes in the future'
        using errcode = '22023';
    end if;

    if new.ended_at_utc <= new.started_at_utc then
      raise exception 'Focus session end time must be after the start time'
        using errcode = '22023';
    end if;

    select p.scoring_timezone
    into v_scoring_timezone
    from public.profiles p
    where p.id = new.user_id;

    if v_scoring_timezone is null then
      raise exception 'Profile scoring timezone is not configured'
        using errcode = 'P0001';
    end if;

    v_duration_minutes := greatest(
      1,
      ceil(extract(epoch from (new.ended_at_utc - new.started_at_utc)) / 60.0)::integer
    );

    new.duration_minutes := v_duration_minutes;
    new.local_event_date := timezone(v_scoring_timezone, new.ended_at_utc)::date;
  else
    new.ended_at_utc := null;
    new.duration_minutes := null;
    new.local_event_date := null;
  end if;

  return new;
end;
$$;

create trigger sync_focus_session_completion_fields
before insert or update on public.focus_sessions
for each row
execute function public.sync_focus_session_completion_fields();

create or replace function public.create_action_event_for_focus_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.action_rules%rowtype;
  v_existing_accepted_count integer;
  v_validation_status public.action_validation_status;
  v_awarded_points integer;
  v_was_capped boolean := false;
  v_dedupe_key text;
  v_week_start_local_date date;
begin
  if new.status <> 'completed' or new.ended_at_utc is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  select *
  into v_rule
  from public.action_rules
  where action_type = 'focus_session'
    and is_enabled = true;

  if not found then
    raise exception 'Action rule focus_session is not configured'
      using errcode = 'P0001';
  end if;

  v_week_start_local_date := date_trunc('week', new.local_event_date::timestamp)::date;
  v_dedupe_key := 'focus_session:' || new.id::text;

  select count(*)
  into v_existing_accepted_count
  from public.action_events ae
  where ae.user_id = new.user_id
    and ae.action_type = 'focus_session'
    and ae.local_event_date = new.local_event_date
    and ae.validation_status = 'accepted';

  if v_existing_accepted_count < v_rule.max_scored_per_day then
    v_validation_status := 'accepted';
    v_awarded_points := v_rule.base_points;
  else
    v_validation_status := 'capped';
    v_awarded_points := 0;
    v_was_capped := true;
  end if;

  insert into public.action_events (
    user_id,
    domain_key,
    action_type,
    source_table,
    source_record_id,
    occurred_at_utc,
    local_event_date,
    week_start_local_date,
    dedupe_key,
    payload_summary,
    validation_status,
    awarded_points,
    was_duplicate,
    was_capped,
    rejection_reason
  )
  values (
    new.user_id,
    v_rule.domain_key,
    'focus_session',
    'focus_sessions',
    new.id,
    new.ended_at_utc,
    new.local_event_date,
    v_week_start_local_date,
    v_dedupe_key,
    jsonb_build_object(
      'duration_minutes', new.duration_minutes,
      'started_at_utc', new.started_at_utc,
      'ended_at_utc', new.ended_at_utc
    ),
    v_validation_status,
    v_awarded_points,
    false,
    v_was_capped,
    case
      when v_was_capped then 'daily cap reached for focus_session'
      else null
    end
  )
  on conflict on constraint action_events_user_dedupe_key_key do nothing;

  return new;
end;
$$;

create trigger create_action_event_for_focus_session
after insert or update on public.focus_sessions
for each row
execute function public.create_action_event_for_focus_session();

alter table public.focus_sessions enable row level security;

create policy "users can read own focus sessions"
on public.focus_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own focus sessions"
on public.focus_sessions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own focus sessions"
on public.focus_sessions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own focus sessions"
on public.focus_sessions
for delete
to authenticated
using ((select auth.uid()) = user_id);
