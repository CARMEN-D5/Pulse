create type public.task_status as enum (
  'pending',
  'completed',
  'cancelled'
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain_key text not null default 'work_productivity' references public.domains (key),
  title text not null,
  notes text,
  is_important boolean not null default true,
  status public.task_status not null default 'pending',
  due_date date,
  completed_at_utc timestamptz,
  completed_local_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (domain_key = 'work_productivity'),
  check (nullif(btrim(title), '') is not null),
  check (
    (
      status = 'completed'
      and completed_at_utc is not null
      and completed_local_date is not null
    )
    or (
      status <> 'completed'
      and completed_at_utc is null
      and completed_local_date is null
    )
  )
);

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create index tasks_user_status_idx
on public.tasks (user_id, status, updated_at desc);

create index tasks_user_completed_local_date_idx
on public.tasks (user_id, completed_local_date desc)
where completed_local_date is not null;

create or replace function public.sync_task_completion_fields()
returns trigger
language plpgsql
as $$
declare
  v_scoring_timezone text;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'completed' and new.status <> 'completed' then
      raise exception 'Completed tasks cannot be marked incomplete'
        using errcode = 'P0001';
    end if;

    if old.completed_at_utc is not null and new.completed_at_utc is distinct from old.completed_at_utc then
      raise exception 'Task completion timestamp cannot be changed once set'
        using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'completed' then
    if new.completed_at_utc is null then
      new.completed_at_utc := timezone('utc', now());
    end if;

    if new.completed_at_utc > timezone('utc', now()) + interval '15 minutes' then
      raise exception 'Completion time cannot be more than 15 minutes in the future'
        using errcode = '22023';
    end if;

    select p.scoring_timezone
    into v_scoring_timezone
    from public.profiles p
    where p.id = new.user_id;

    if v_scoring_timezone is null then
      raise exception 'Profile scoring timezone is not configured'
        using errcode = 'P0001';
    end if;

    new.completed_local_date := timezone(v_scoring_timezone, new.completed_at_utc)::date;
  else
    new.completed_at_utc := null;
    new.completed_local_date := null;
  end if;

  return new;
end;
$$;

create trigger sync_task_completion_fields
before insert or update on public.tasks
for each row
execute function public.sync_task_completion_fields();

create or replace function public.create_action_event_for_completed_task()
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
  if new.status <> 'completed' or new.is_important = false or new.completed_at_utc is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' and old.is_important = true then
    return new;
  end if;

  select *
  into v_rule
  from public.action_rules
  where action_type = 'important_task_completed'
    and is_enabled = true;

  if not found then
    raise exception 'Action rule important_task_completed is not configured'
      using errcode = 'P0001';
  end if;

  v_week_start_local_date := date_trunc('week', new.completed_local_date::timestamp)::date;
  v_dedupe_key := 'important_task_completed:' || new.id::text;

  select count(*)
  into v_existing_accepted_count
  from public.action_events ae
  where ae.user_id = new.user_id
    and ae.action_type = 'important_task_completed'
    and ae.local_event_date = new.completed_local_date
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
    'important_task_completed',
    'tasks',
    new.id,
    new.completed_at_utc,
    new.completed_local_date,
    v_week_start_local_date,
    v_dedupe_key,
    jsonb_build_object(
      'title_length', char_length(btrim(new.title)),
      'has_notes', nullif(btrim(coalesce(new.notes, '')), '') is not null,
      'due_date_present', new.due_date is not null,
      'is_important', new.is_important
    ),
    v_validation_status,
    v_awarded_points,
    false,
    v_was_capped,
    case
      when v_was_capped then 'daily cap reached for important_task_completed'
      else null
    end
  )
  on conflict on constraint action_events_user_dedupe_key_key do nothing;

  return new;
end;
$$;

create trigger create_action_event_for_completed_task
after insert or update on public.tasks
for each row
execute function public.create_action_event_for_completed_task();

alter table public.tasks enable row level security;

create policy "users can read own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can insert own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete own tasks"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);
