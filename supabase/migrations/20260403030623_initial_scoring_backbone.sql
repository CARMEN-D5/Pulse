create extension if not exists pgcrypto with schema extensions;

create type public.action_validation_status as enum (
  'accepted',
  'duplicate',
  'invalid',
  'capped'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  scoring_timezone text,
  onboarding_completed_at timestamptz,
  current_streak_days integer not null default 0 check (current_streak_days >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.domains (
  key text primary key,
  label text not null,
  sort_order integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_domains_updated_at
before update on public.domains
for each row
execute function public.set_updated_at();

create table public.domain_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain_key text not null references public.domains (key),
  initial_rating_value smallint not null check (initial_rating_value between 1 and 5),
  initial_rating_score numeric(5,2) not null check (initial_rating_score in (20, 40, 60, 80, 100)),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, domain_key)
);

create index domain_baselines_user_id_idx
on public.domain_baselines (user_id);

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain_key text not null references public.domains (key),
  rating_value smallint not null check (rating_value between 1 and 5),
  rating_score numeric(5,2) not null check (rating_score in (20, 40, 60, 80, 100)),
  occurred_at_utc timestamptz not null,
  local_event_date date not null,
  week_start_local_date date not null check (extract(isodow from week_start_local_date) = 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, domain_key, local_event_date)
);

create trigger set_daily_checkins_updated_at
before update on public.daily_checkins
for each row
execute function public.set_updated_at();

create index daily_checkins_user_week_domain_idx
on public.daily_checkins (user_id, week_start_local_date, domain_key);

create index daily_checkins_user_local_date_idx
on public.daily_checkins (user_id, local_event_date desc);

create table public.action_rules (
  action_type text primary key,
  domain_key text not null references public.domains (key),
  base_points integer not null check (base_points >= 0),
  max_scored_per_day integer not null check (max_scored_per_day >= 1),
  requires_nonempty_content boolean not null default false,
  requires_unique_reference boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_action_rules_updated_at
before update on public.action_rules
for each row
execute function public.set_updated_at();

create table public.action_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain_key text not null references public.domains (key),
  action_type text not null references public.action_rules (action_type),
  source_table text not null,
  source_record_id uuid,
  occurred_at_utc timestamptz not null,
  local_event_date date not null,
  week_start_local_date date not null check (extract(isodow from week_start_local_date) = 1),
  dedupe_key text,
  payload_summary jsonb not null default '{}'::jsonb,
  validation_status public.action_validation_status not null,
  awarded_points integer not null default 0 check (awarded_points >= 0),
  was_duplicate boolean not null default false,
  was_capped boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index action_events_user_dedupe_key_idx
on public.action_events (user_id, dedupe_key)
where dedupe_key is not null;

create index action_events_user_week_domain_idx
on public.action_events (user_id, week_start_local_date, domain_key);

create index action_events_user_local_date_action_type_idx
on public.action_events (user_id, local_event_date, action_type);

insert into public.domains (key, label, sort_order)
values
  ('spirituality', 'Spirituality', 1),
  ('family_friends', 'Family and Friends', 2),
  ('work_productivity', 'Work/Productivity', 3),
  ('health', 'Health', 4),
  ('financial_wellbeing', 'Financial Wellbeing', 5);

insert into public.action_rules (
  action_type,
  domain_key,
  base_points,
  max_scored_per_day,
  requires_nonempty_content,
  requires_unique_reference
)
values
  ('journal_entry', 'spirituality', 50, 1, true, false),
  ('meaningful_connection_log', 'family_friends', 50, 2, true, false),
  ('important_task_completed', 'work_productivity', 25, 5, false, true),
  ('focus_session', 'work_productivity', 25, 4, false, true),
  ('exercise_log', 'health', 50, 2, false, false),
  ('sleep_log', 'health', 50, 1, false, true),
  ('expense_log', 'financial_wellbeing', 25, 5, false, false),
  ('budget_review_or_savings_action', 'financial_wellbeing', 50, 1, false, false);
