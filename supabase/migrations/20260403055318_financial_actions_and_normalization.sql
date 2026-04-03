create table public.financial_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action_kind text not null,
  amount numeric(12,2),
  note text,
  occurred_at_utc timestamptz not null default timezone('utc', now()),
  local_event_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (nullif(btrim(action_kind), '') is not null),
  check (amount is null or amount > 0)
);

create trigger set_financial_actions_updated_at
before update on public.financial_actions
for each row
execute function public.set_updated_at();

create index financial_actions_user_local_event_date_idx
on public.financial_actions (user_id, local_event_date desc);

create index financial_actions_user_action_kind_idx
on public.financial_actions (user_id, action_kind, occurred_at_utc desc);

create or replace function public.sync_financial_action_local_event_date()
returns trigger
language plpgsql
as $$
declare
  v_scoring_timezone text;
begin
  if new.occurred_at_utc > timezone('utc', now()) + interval '15 minutes' then
    raise exception 'Financial action time cannot be more than 15 minutes in the future'
      using errcode = '22023';
  end if;

  new.action_kind := btrim(new.action_kind);

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

create trigger sync_financial_action_local_event_date
before insert or update on public.financial_actions
for each row
execute function public.sync_financial_action_local_event_date();

create or replace function public.upsert_action_event_for_financial_action()
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
  where action_type = 'budget_review_or_savings_action'
    and is_enabled = true;

  if not found then
    raise exception 'Action rule budget_review_or_savings_action is not configured'
      using errcode = 'P0001';
  end if;

  v_week_start_local_date := date_trunc('week', new.local_event_date::timestamp)::date;
  v_dedupe_key := 'budget_review_or_savings_action:' || new.id::text;

  select count(*)
  into v_existing_accepted_count
  from public.action_events ae
  where ae.user_id = new.user_id
    and ae.action_type = 'budget_review_or_savings_action'
    and ae.local_event_date = new.local_event_date
    and ae.validation_status = 'accepted'
    and not (
      ae.source_table = 'financial_actions'
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
    'budget_review_or_savings_action',
    'financial_actions',
    new.id,
    new.occurred_at_utc,
    new.local_event_date,
    v_week_start_local_date,
    v_dedupe_key,
    jsonb_build_object(
      'action_kind', new.action_kind,
      'amount', new.amount,
      'has_note', nullif(btrim(coalesce(new.note, '')), '') is not null
    ),
    v_validation_status,
    v_awarded_points,
    false,
    v_was_capped,
    case
      when v_was_capped then 'daily cap reached for budget_review_or_savings_action'
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

create trigger upsert_action_event_for_financial_action
after insert or update on public.financial_actions
for each row
execute function public.upsert_action_event_for_financial_action();

alter table public.financial_actions enable row level security;

create policy "users can read own financial actions"
on public.financial_actions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own financial actions"
on public.financial_actions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own financial actions"
on public.financial_actions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own financial actions"
on public.financial_actions
for delete
to authenticated
using ((select auth.uid()) = user_id);
