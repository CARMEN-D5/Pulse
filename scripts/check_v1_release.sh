#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DB_URL="${VELORA_LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "Running V1 mobile/shared typechecks..."
(cd "$ROOT_DIR" && npm run typecheck:v1)

echo "Checking local Supabase runtime objects..."
psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select 'public.complete_onboarding(text,text,jsonb)' as required_object
where to_regprocedure('public.complete_onboarding(text,text,jsonb)') is not null;

select 'public.submit_daily_checkin(text,smallint,timestamptz)' as required_object
where to_regprocedure('public.submit_daily_checkin(text,smallint,timestamptz)') is not null;

select 'public.run_weekly_summary_scheduler(timestamptz,integer)' as required_object
where to_regprocedure('public.run_weekly_summary_scheduler(timestamptz,integer)') is not null;

select jobname, schedule, active
from cron.job
where jobname = 'velora-weekly-summary-hourly';
SQL

echo "V1 local release check passed."
