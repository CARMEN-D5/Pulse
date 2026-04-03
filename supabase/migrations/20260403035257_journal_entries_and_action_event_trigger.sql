create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  body text not null,
  occurred_at_utc timestamptz not null default timezone('utc', now()),
  local_event_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (nullif(btrim(body), '') is not null)
);

create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row
execute function public.set_updated_at();

create index journal_entries_user_local_event_date_idx
on public.journal_entries (user_id, local_event_date desc);

create or replace function public.set_journal_entry_local_event_date()
returns trigger
language plpgsql
as $$
declare
  v_scoring_timezone text;
begin
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

create trigger set_journal_entry_local_event_date
before insert or update on public.journal_entries
for each row
execute function public.set_journal_entry_local_event_date();

create or replace function public.create_action_event_for_journal_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.action_rules%rowtype;
  v_week_start_local_date date;
  v_existing_accepted_count integer;
  v_validation_status public.action_validation_status;
  v_awarded_points integer;
  v_was_capped boolean := false;
  v_dedupe_key text;
begin
  select *
  into v_rule
  from public.action_rules
  where action_type = 'journal_entry'
    and is_enabled = true;

  if not found then
    raise exception 'Action rule journal_entry is not configured'
      using errcode = 'P0001';
  end if;

  v_week_start_local_date := date_trunc('week', new.local_event_date::timestamp)::date;
  v_dedupe_key := 'journal_entry:' || new.id::text;

  select count(*)
  into v_existing_accepted_count
  from public.action_events ae
  where ae.user_id = new.user_id
    and ae.action_type = 'journal_entry'
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
    'journal_entry',
    'journal_entries',
    new.id,
    new.occurred_at_utc,
    new.local_event_date,
    v_week_start_local_date,
    v_dedupe_key,
    jsonb_build_object(
      'has_title', nullif(btrim(coalesce(new.title, '')), '') is not null,
      'body_length', char_length(btrim(new.body))
    ),
    v_validation_status,
    v_awarded_points,
    false,
    v_was_capped,
    case
      when v_was_capped then 'daily cap reached for journal_entry'
      else null
    end
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

create trigger create_action_event_for_journal_entry
after insert on public.journal_entries
for each row
execute function public.create_action_event_for_journal_entry();

alter table public.journal_entries enable row level security;

create policy "users can read own journal entries"
on public.journal_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own journal entries"
on public.journal_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own journal entries"
on public.journal_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
