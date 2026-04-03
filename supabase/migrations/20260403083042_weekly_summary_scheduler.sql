create extension if not exists pg_cron;

create or replace function public.run_weekly_summary_scheduler(
  p_reference_utc timestamptz default timezone('utc', now()),
  p_limit integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_processed_count integer := 0;
begin
  if p_limit < 1 then
    raise exception 'p_limit must be at least 1'
      using errcode = '22023';
  end if;

  select count(*)
  into v_processed_count
  from public.run_previous_closed_weekly_life_summary_batch(
    p_reference_utc,
    p_limit
  );

  return jsonb_build_object(
    'ok', true,
    'processed_count', v_processed_count,
    'reference_utc', p_reference_utc
  );
end;
$$;

create or replace function public.ensure_weekly_summary_cron_job()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id bigint;
begin
  select cron.schedule(
    'velora-weekly-summary-hourly',
    '11 * * * *',
    $job$select public.run_weekly_summary_scheduler();$job$
  )
  into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.remove_weekly_summary_cron_job()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removed boolean := false;
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'velora-weekly-summary-hourly'
  ) then
    perform cron.unschedule('velora-weekly-summary-hourly');
    v_removed := true;
  end if;

  return v_removed;
end;
$$;

revoke all on function public.run_weekly_summary_scheduler(timestamptz, integer) from public, anon, authenticated;
revoke all on function public.ensure_weekly_summary_cron_job() from public, anon, authenticated;
revoke all on function public.remove_weekly_summary_cron_job() from public, anon, authenticated;

select public.ensure_weekly_summary_cron_job();
