create table public.weekly_domain_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain_key text not null references public.domains (key),
  week_start_local_date date not null check (extract(isodow from week_start_local_date) = 1),
  week_end_local_date date not null,
  active_days_in_window integer not null check (active_days_in_window between 1 and 7),
  reflection_days_count integer not null default 0 check (reflection_days_count between 0 and 7),
  reflection_score numeric(5,2) check (
    reflection_score is null or
    (reflection_score >= 0 and reflection_score <= 100)
  ),
  action_points_earned integer not null default 0 check (action_points_earned >= 0),
  action_target_points numeric(8,2) not null check (action_target_points > 0),
  action_score numeric(5,2) not null check (action_score >= 0 and action_score <= 100),
  consistency_days_count integer not null default 0 check (consistency_days_count between 0 and 7),
  consistency_score numeric(5,2) not null check (consistency_score >= 0 and consistency_score <= 100),
  current_computed_score numeric(5,2) not null check (
    current_computed_score >= 0 and current_computed_score <= 100
  ),
  blended_computed_score numeric(5,2) check (
    blended_computed_score is null or
    (blended_computed_score >= 0 and blended_computed_score <= 100)
  ),
  displayed_score numeric(5,2) not null check (displayed_score >= 0 and displayed_score <= 100),
  bootstrap_weight_used numeric(3,2) not null check (bootstrap_weight_used >= 0 and bootstrap_weight_used <= 1),
  observed_weight_used numeric(3,2) not null check (observed_weight_used >= 0 and observed_weight_used <= 1),
  used_reflection_reweighting boolean not null default false,
  is_provisional boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, domain_key, week_start_local_date),
  check (week_end_local_date >= week_start_local_date),
  check (reflection_days_count <= active_days_in_window),
  check (consistency_days_count <= active_days_in_window),
  check (round((bootstrap_weight_used + observed_weight_used)::numeric, 2) = 1.00)
);

create trigger set_weekly_domain_summaries_updated_at
before update on public.weekly_domain_summaries
for each row
execute function public.set_updated_at();

create index weekly_domain_summaries_user_week_idx
on public.weekly_domain_summaries (user_id, week_start_local_date desc);

create index weekly_domain_summaries_user_domain_week_idx
on public.weekly_domain_summaries (user_id, domain_key, week_start_local_date desc);

create table public.weekly_life_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start_local_date date not null check (extract(isodow from week_start_local_date) = 1),
  week_end_local_date date not null,
  life_strength numeric(5,2) not null check (life_strength >= 0 and life_strength <= 100),
  evenness numeric(5,2) not null check (evenness >= 0 and evenness <= 100),
  balanced_life_score numeric(5,2) not null check (
    balanced_life_score >= 0 and balanced_life_score <= 100
  ),
  strongest_domain_key text references public.domains (key),
  weakest_domain_key text references public.domains (key),
  is_provisional boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, week_start_local_date),
  check (week_end_local_date >= week_start_local_date)
);

create trigger set_weekly_life_summaries_updated_at
before update on public.weekly_life_summaries
for each row
execute function public.set_updated_at();

create index weekly_life_summaries_user_week_idx
on public.weekly_life_summaries (user_id, week_start_local_date desc);
