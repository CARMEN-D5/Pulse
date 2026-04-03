create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.map_rating_value_to_score(p_rating smallint)
returns numeric
language sql
immutable
as $$
  select case p_rating
    when 1 then 20
    when 2 then 40
    when 3 then 60
    when 4 then 80
    when 5 then 100
    else null
  end;
$$;

create or replace function public.complete_onboarding(
  p_display_name text,
  p_scoring_timezone text,
  p_initial_ratings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_rating record;
begin
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_scoring_timezone is null
     or not exists (
       select 1
       from pg_timezone_names
       where name = p_scoring_timezone
     ) then
    raise exception 'Invalid scoring timezone'
      using errcode = '22023';
  end if;

  if p_initial_ratings is null or jsonb_typeof(p_initial_ratings) <> 'object' then
    raise exception 'initial_ratings must be a JSON object'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.domains d
    where not (p_initial_ratings ? d.key)
  ) then
    raise exception 'initial_ratings must contain all supported domain keys'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_initial_ratings) as provided_keys(provided_key)
    where not exists (
      select 1
      from public.domains d
      where d.key = provided_keys.provided_key
    )
  ) then
    raise exception 'initial_ratings contains unsupported domain keys'
      using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if v_profile.onboarding_completed_at is not null then
    raise exception 'Onboarding has already been completed'
      using errcode = 'P0001';
  end if;

  for v_rating in
    select key, value
    from jsonb_each_text(p_initial_ratings)
  loop
    if v_rating.value !~ '^[1-5]$' then
      raise exception 'All initial ratings must be integers from 1 to 5'
        using errcode = '22023';
    end if;
  end loop;

  update public.profiles
  set
    display_name = nullif(trim(p_display_name), ''),
    scoring_timezone = p_scoring_timezone,
    onboarding_completed_at = timezone('utc', now())
  where id = v_user_id;

  insert into public.domain_baselines (
    user_id,
    domain_key,
    initial_rating_value,
    initial_rating_score
  )
  select
    v_user_id,
    rating.key,
    rating.value::smallint,
    public.map_rating_value_to_score(rating.value::smallint)
  from jsonb_each_text(p_initial_ratings) as rating
  on conflict (user_id, domain_key)
  do update set
    initial_rating_value = excluded.initial_rating_value,
    initial_rating_score = excluded.initial_rating_score;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'onboarding_completed', true
  );
end;
$$;

revoke all on function public.complete_onboarding(text, text, jsonb) from public;
revoke all on function public.complete_onboarding(text, text, jsonb) from anon;
grant execute on function public.complete_onboarding(text, text, jsonb) to authenticated;

revoke all on function public.map_rating_value_to_score(smallint) from public;
revoke all on function public.map_rating_value_to_score(smallint) from anon;
revoke all on function public.map_rating_value_to_score(smallint) from authenticated;
