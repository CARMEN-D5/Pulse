# Supabase Workspace

This directory contains the local Supabase project scaffold for VELORA.

Current purpose:
- local Supabase configuration
- SQL migrations
- seed data
- future Edge Functions if needed
- scheduled weekly summary orchestration through `pg_cron`

Important note:
- this is the intended backend direction for VELORA going forward
- Firebase scaffold files remain in the repository temporarily while the backend pivot is completed

Current V1 scheduler path:
- `public.run_weekly_summary_scheduler(...)` wraps the weekly batch helper
- `public.ensure_weekly_summary_cron_job()` registers the hourly cron job
- the active cron job name is `velora-weekly-summary-hourly`
- the job runs `select public.run_weekly_summary_scheduler();`

Useful local commands:
- `npm run supabase:start`
- `npm run supabase:db:push:local`
- `npm run qa:v1:local`
