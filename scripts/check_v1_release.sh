#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DB_URL="${VELORA_LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "Running V1 mobile/shared typechecks..."
(cd "$ROOT_DIR" && npm run typecheck:v1)

echo "Checking local Supabase runtime objects..."
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare
  v_required_tables text[] := array[
    'public.profiles',
    'public.domain_baselines',
    'public.daily_checkins',
    'public.action_rules',
    'public.action_events',
    'public.journal_entries',
    'public.tasks',
    'public.focus_sessions',
    'public.activity_logs',
    'public.sleep_logs',
    'public.expense_logs',
    'public.financial_actions',
    'public.connection_logs',
    'public.weekly_domain_summaries',
    'public.weekly_life_summaries'
  ];
  v_table_name text;
begin
  foreach v_table_name in array v_required_tables
  loop
    if to_regclass(v_table_name) is null then
      raise exception 'Missing required table: %', v_table_name;
    end if;
  end loop;
end
$$;

select 'public.complete_onboarding(text,text,jsonb)' as required_object
where to_regprocedure('public.complete_onboarding(text,text,jsonb)') is not null;

select 'public.submit_daily_checkin(text,smallint,timestamptz)' as required_object
where to_regprocedure('public.submit_daily_checkin(text,smallint,timestamptz)') is not null;

select 'public.run_weekly_summary_scheduler(timestamptz,integer)' as required_object
where to_regprocedure('public.run_weekly_summary_scheduler(timestamptz,integer)') is not null;

select jobname, schedule, active
from cron.job
where jobname = 'velora-weekly-summary-hourly';

select count(*) as domain_count
from public.domains;

select count(*) as action_rule_count
from public.action_rules;
SQL

echo "V1 local release check passed."
