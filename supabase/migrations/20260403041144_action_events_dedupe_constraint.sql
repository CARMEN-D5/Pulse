drop index if exists public.action_events_user_dedupe_key_idx;

alter table public.action_events
add constraint action_events_user_dedupe_key_key unique (user_id, dedupe_key);
