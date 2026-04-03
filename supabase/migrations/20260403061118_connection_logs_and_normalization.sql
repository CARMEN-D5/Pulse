create table public.connection_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  connection_type text,
  contact_label text,
  note text,
  occurred_at_utc timestamptz not null default timezone('utc', now()),
  local_event_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    nullif(btrim(coalesce(connection_type, '')), '') is not null
    or nullif(btrim(coalesce(contact_label, '')), '') is not null
    or nullif(btrim(coalesce(note, '')), '') is not null
  )
);

create trigger set_connection_logs_updated_at
before update on public.connection_logs
for each row
execute function public.set_updated_at();

create index connection_logs_user_local_event_date_idx
on public.connection_logs (user_id, local_event_date desc);

create index connection_logs_user_connection_type_idx
on public.connection_logs (user_id, connection_type, occurred_at_utc desc);

create or replace function public.sync_connection_log_local_event_date()
returns trigger
language plpgsql
as $$
declare
  v_scoring_timezone text;
begin
  if new.occurred_at_utc > timezone('utc', now()) + interval '15 minutes' then
    raise exception 'Connection log time cannot be more than 15 minutes in the future'
      using errcode = '22023';
  end if;

  new.connection_type := nullif(btrim(coalesce(new.connection_type, '')), '');
  new.contact_label := nullif(btrim(coalesce(new.contact_label, '')), '');
  new.note := nullif(btrim(coalesce(new.note, '')), '');

  select p.scoring_timezone
  into v_scoring_timezone
  from public.profiles p
  where p.id = new.user_id;

  if v_scoring_timezone is null then
    raise exception 'Profile scoring timezone is not configured'
      using errcode = 'P0001';
  end if;

  new.local_event_date := timezone(v_scoring_timezone, new.occurred_at_utc)::date;
  return new;
end;
$$;

create trigger sync_connection_log_local_event_date
before insert or update on public.connection_logs
for each row
execute function public.sync_connection_log_local_event_date();

create or replace function public.upsert_action_event_for_connection_log()
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
  select *
  into v_rule
  from public.action_rules
  where action_type = 'meaningful_connection_log'
    and is_enabled = true;

  if not found then
    raise exception 'Action rule meaningful_connection_log is not configured'
      using errcode = 'P0001';
  end if;

  v_week_start_local_date := date_trunc('week', new.local_event_date::timestamp)::date;
  v_dedupe_key := 'meaningful_connection_log:' || new.id::text;

  select count(*)
  into v_existing_accepted_count
  from public.action_events ae
  where ae.user_id = new.user_id
    and ae.action_type = 'meaningful_connection_log'
    and ae.local_event_date = new.local_event_date
    and ae.validation_status = 'accepted'
    and not (
      ae.source_table = 'connection_logs'
      and ae.source_record_id = new.id
    );

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
    'meaningful_connection_log',
    'connection_logs',
    new.id,
    new.occurred_at_utc,
    new.local_event_date,
    v_week_start_local_date,
    v_dedupe_key,
    jsonb_build_object(
      'connection_type', new.connection_type,
      'contact_label', new.contact_label,
      'has_note', new.note is not null
    ),
    v_validation_status,
    v_awarded_points,
    false,
    v_was_capped,
    case
      when v_was_capped then 'daily cap reached for meaningful_connection_log'
      else null
    end
  )
  on conflict on constraint action_events_user_dedupe_key_key
  do update set
    domain_key = excluded.domain_key,
    action_type = excluded.action_type,
    source_table = excluded.source_table,
    source_record_id = excluded.source_record_id,
    occurred_at_utc = excluded.occurred_at_utc,
    local_event_date = excluded.local_event_date,
    week_start_local_date = excluded.week_start_local_date,
    payload_summary = excluded.payload_summary,
    validation_status = excluded.validation_status,
    awarded_points = excluded.awarded_points,
    was_duplicate = excluded.was_duplicate,
    was_capped = excluded.was_capped,
    rejection_reason = excluded.rejection_reason;

  return new;
end;
$$;

create trigger upsert_action_event_for_connection_log
after insert or update on public.connection_logs
for each row
execute function public.upsert_action_event_for_connection_log();

alter table public.connection_logs enable row level security;

create policy "users can read own connection logs"
on public.connection_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own connection logs"
on public.connection_logs
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own connection logs"
on public.connection_logs
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own connection logs"
on public.connection_logs
for delete
to authenticated
using ((select auth.uid()) = user_id);
