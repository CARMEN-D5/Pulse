alter table public.profiles enable row level security;
alter table public.domains enable row level security;
alter table public.domain_baselines enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.action_rules enable row level security;
alter table public.action_events enable row level security;
alter table public.weekly_domain_summaries enable row level security;
alter table public.weekly_life_summaries enable row level security;

create policy "authenticated users can read domains"
on public.domains
for select
to authenticated
using (true);

create policy "authenticated users can read action rules"
on public.action_rules
for select
to authenticated
using (true);

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "users can read own baselines"
on public.domain_baselines
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read own daily checkins"
on public.daily_checkins
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read own action events"
on public.action_events
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read own weekly domain summaries"
on public.weekly_domain_summaries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can read own weekly life summaries"
on public.weekly_life_summaries
for select
to authenticated
using ((select auth.uid()) = user_id);
