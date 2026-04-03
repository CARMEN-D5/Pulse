# VELORA Supabase Sequencing

Last updated: 2026-04-03

This document defines the recommended implementation sequence for VELORA if the product prioritizes:

- scoring correctness
- future analytics
- better long-term advice generation
- a relational backend data model

Under that priority, Supabase is the recommended backend direction.

## Current implementation snapshot

Completed so far:
- local Supabase project scaffold and migration workflow
- scoring backbone tables, summary tables, and RLS policies
- onboarding RPC, daily check-in RPC, normalization triggers, and weekly summary SQL helpers
- local verification of the backend scoring pipeline with the Supabase local stack
- mobile Supabase client, auth session boundary, profile boundary, onboarding flow, tab navigation, dashboard reads, summary reads, settings, and daily check-ins
- V1 action module UI for journal, connection logs, tasks, focus sessions, activity logs, sleep logs, expense logs, and financial actions

Still open for V1:
- production scheduling for weekly summary orchestration
- action-module polish for richer edit/delete flows and stronger UX feedback
- summary/history visualization upgrades
- release hardening and cross-document cleanup

## Why this sequence exists

The repository currently contains:
- a mobile-first Expo scaffold
- a Firebase-oriented backend scaffold
- shared TypeScript utilities

Because the Firebase implementation is still at scaffold stage, the project can pivot now without major rewrite cost.

The goal of this sequence is:
- keep `mobile/` and `shared/`
- replace the Firebase backend direction with Supabase
- make the scoring system relational from the start

## Recommended sequencing

### Phase S0: Freeze current direction and pivot cleanly

Goal:
- stop Firebase-specific implementation from spreading further

Tasks:
- keep `mobile/` as the React Native + Expo + TypeScript app
- keep `shared/` for score formulas and domain constants
- treat Firebase files as temporary scaffolding only
- decide whether to delete Firebase scaffolding immediately or keep it until Supabase setup is complete

Recommendation:
- keep the files briefly for reference
- do not build new product logic on top of them

Exit criteria:
- the team agrees Supabase is the new backend source of truth

### Phase S1: Create Supabase backend foundation

Goal:
- establish the actual backend platform

Tasks:
- create Supabase project
- add local Supabase configuration to the repo
- add SQL migration workflow
- add environment variable strategy for mobile and backend access
- define Auth, Database, Storage, and Edge Function usage boundaries

Key deliverables:
- `supabase/` folder
- migration files
- seed files if needed
- local development instructions

Exit criteria:
- Supabase local or remote dev environment is reachable
- migrations can run successfully

### Phase S2: Convert data model into SQL schema

Goal:
- make the scoring architecture relational before app features deepen

Tasks:
- translate the blueprint into Postgres tables
- define enums or lookup tables for domains and action types
- create:
  - `profiles`
  - `domain_baselines`
  - `daily_checkins`
  - `action_rules`
  - `action_events`
  - feature tables
  - `weekly_domain_summaries`
  - `weekly_life_summaries`
- add primary keys, foreign keys, unique constraints, and indexes

Most important rules to encode:
- one daily check-in per user, domain, and local date
- stable weekly summary uniqueness
- strong event traceability

Exit criteria:
- schema migrations create the full scoring backbone

Current progress:
- initial scoring backbone migration created
- weekly summary tables migration created
- local Supabase stack was started successfully and the core schema was verified locally

### Phase S3: Add Row Level Security and auth-safe access

Goal:
- protect sensitive personal data from the start

Tasks:
- wire Supabase Auth
- define RLS policies for all user-owned tables
- restrict read and write access by authenticated user id
- keep summary and derived data private per user
- make shared lookup tables read-only where appropriate

Exit criteria:
- one user cannot read or write another user's personal data

Current progress:
- core RLS migration created for profiles, lookup tables, score-input tables, and weekly summary tables
- lookup tables are authenticated read-only
- summary and normalized action tables are client read-only
- `daily_checkins` are intentionally not client-writable in the first pass because they affect score truth and will be routed through backend logic later

### Phase S4: Move backend workflows to SQL functions and server logic

Goal:
- make score truth backend-authoritative using Supabase-native patterns

Tasks:
- decide which logic belongs in:
  - SQL functions
  - database triggers
  - Edge Functions
- implement onboarding write flow
- implement daily check-in write flow
- implement action normalization
- implement weekly score generation pipeline

Recommended split:
- database constraints for hard integrity rules
- SQL functions for aggregation and score computation
- Edge Functions for orchestration and external-facing workflows

Exit criteria:
- backend can accept valid inputs and produce correct score outputs without client authority

Current progress:
- auth user to profile trigger created
- onboarding helper function for rating mapping created
- `complete_onboarding(display_name, scoring_timezone, initial_ratings)` RPC created
- onboarding currently validates authentication, timezone, supported domain keys, and 1..5 rating values before writing baselines
- local Supabase stack was started successfully
- onboarding flow was verified locally with a throwaway auth user and produced the expected `profiles` and `domain_baselines` rows
- `submit_daily_checkin(domain_key, rating_value, occurred_at_utc)` RPC created
- daily check-in was verified locally with the throwaway auth user
- same-day daily check-ins correctly upserted a single row per user, domain, and local date
- the future timestamp guard was exercised and rejected an unreasonably future timestamp as intended
- `journal_entries` feature table created with RLS and timezone-derived `local_event_date`
- journal-entry normalization trigger now creates backend-owned `action_events`
- first live verification exposed that `action_events` had a partial unique index on `(user_id, dedupe_key)`, which could not be used by the trigger's `ON CONFLICT` clause
- follow-up migration replaced that partial index with a proper unique constraint on `(user_id, dedupe_key)`
- journal-entry flow was then verified locally with the throwaway auth user
- first same-day journal entry produced an `accepted` action event with `50` awarded points
- second same-day journal entry produced a `capped` action event with `0` awarded points
- direct authenticated inserts into `action_events` remained blocked by RLS as intended
- `tasks` feature table created for the `work_productivity` module with pending/completed/cancelled status
- task completion fields are derived from the user's `scoring_timezone` and guarded against unreasonable future timestamps
- completed tasks are intentionally immutable for score integrity: completion cannot be removed or have its timestamp rewritten once set
- `important_task_completed` normalization trigger now creates backend-owned `action_events` from task completion
- local verification confirmed that a pending task can be completed and produces one `accepted` action event with `25` awarded points
- editing the title of a completed task did not create a duplicate normalized event
- attempting to mark a completed task back to `pending` was rejected by the completion-integrity trigger as intended
- `focus_sessions` feature table created for `work_productivity` with `in_progress`, `completed`, and `cancelled` status
- focus session completion derives `duration_minutes` and `local_event_date` from backend timestamps and the user's `scoring_timezone`
- completed focus sessions are immutable for score integrity: timing cannot be rewritten once the session is completed
- `focus_session` normalization trigger now creates backend-owned `action_events` from completed sessions
- local verification confirmed that an in-progress session can be completed and produces one `accepted` action event with `25` awarded points
- local verification also exercised the daily cap: four same-day focus sessions were accepted and the fifth same-day session was capped at `0`
- attempting to edit the timing of a completed focus session was rejected by the completion-integrity trigger as intended
- `activity_logs` feature table created for the Health domain with backend-derived `local_event_date`
- activity-log validation currently requires a non-empty `activity_type`; minimum duration or distance remains a future enhancement
- `exercise_log` normalization uses an upsert pattern on insert or update so a corrected log stays mapped to a single normalized action event
- local verification confirmed that a valid activity log produced one `accepted` action event with `50` awarded points
- local verification also exercised the Health-domain daily cap: two same-day activity logs were accepted and the third same-day log was capped at `0`
- updating an existing activity log changed the payload in the existing normalized action event without creating a duplicate score input
- `sleep_logs` feature table created for the Health domain with backend-derived `duration_minutes` and `local_event_date`
- for MVP, sleep logs are assigned to the wake-up day: `local_event_date` is derived from `sleep_end_utc` in the user's `scoring_timezone`
- `sleep_log` normalization uses an upsert pattern on insert or update so a corrected sleep record stays mapped to a single normalized action event
- local verification confirmed that a valid sleep log produced one `accepted` action event with `50` awarded points
- local verification also exercised the Health-domain sleep cap: one same-day sleep log was accepted and the second same-day sleep log was capped at `0`
- updating an existing sleep log changed the payload in the existing normalized action event without creating a duplicate score input
- `expense_logs` feature table created for the Financial Wellbeing domain with backend-derived `local_event_date`
- expense-log validation currently requires a positive `amount`, a 3-letter uppercase `currency_code`, and a non-empty `category`
- `expense_log` normalization uses an upsert pattern on insert or update so a corrected expense entry stays mapped to a single normalized action event
- local verification confirmed that a valid expense log produced one `accepted` action event with `25` awarded points
- local verification also exercised the Financial Wellbeing daily cap: five same-day expense logs were accepted and the sixth same-day log was capped at `0`
- updating an existing expense log changed the payload in the existing normalized action event without creating a duplicate score input
- `financial_actions` feature table created for budget review and savings actions in the Financial Wellbeing domain
- financial-action validation currently requires a non-empty `action_kind`; `amount` is optional but must be positive if provided
- `budget_review_or_savings_action` normalization uses an upsert pattern on insert or update so a corrected financial action stays mapped to a single normalized action event
- local verification confirmed that a valid financial action produced one `accepted` action event with `50` awarded points
- local verification also exercised the Financial Wellbeing daily cap: one same-day financial action was accepted and the second same-day action was capped at `0`
- updating an existing financial action changed the payload in the existing normalized action event without creating a duplicate score input
- `connection_logs` feature table created for the Family/Friends domain with backend-derived `local_event_date`
- meaningful-connection validation currently requires at least one meaningful signal: `connection_type`, `contact_label`, or `note`
- `contact_label` was added as an optional field because it matches the locked scoring rule and helps capture meaningful social interactions without forcing a long note
- `meaningful_connection_log` normalization uses an upsert pattern on insert or update so a corrected connection log stays mapped to a single normalized action event
- local verification confirmed that a valid connection log produced one `accepted` action event with `50` awarded points
- local verification also exercised the Family/Friends daily cap: two same-day connection logs were accepted and the third same-day log was capped at `0`
- updating an existing connection log changed the payload in the existing normalized action event without creating a duplicate score input
- weekly domain helper functions now exist for:
  - score clamping
  - per-domain weekly action targets
  - onboarding blend weights
  - weekly domain-score calculation
  - weekly domain-summary upsert
- the weekly domain helper computes:
  - reflection score from `daily_checkins`
  - action score from accepted `action_events`
  - consistency score from daily check-in days
  - current computed score with missing-reflection reweighting
  - onboarding blend
  - displayed score smoothing
  - partial first-week and current open-week provisional status
- local verification confirmed the helper returned sensible values for:
  - `health` with reflection present
  - `work_productivity` with reflection missing and reweighting applied
- local verification also confirmed `upsert_weekly_domain_summary(...)` persisted summary rows into `weekly_domain_summaries`
- authenticated clients do not have `EXECUTE` privileges on the weekly-summary helper functions; weekly summary writes remain backend-owned
- weekly life-summary helper functions now exist for:
  - evenness calculation
  - weekly life-score aggregation
  - weekly life-summary upsert
- the life helper orchestrates the five active domain upserts first, then aggregates their `displayed_score` values into:
  - `life_strength`
  - `evenness`
  - `balanced_life_score`
  - `strongest_domain_key`
  - `weakest_domain_key`
- local verification confirmed `upsert_weekly_life_summary(...)` produced a coherent weekly aggregate for the throwaway user and persisted it into `weekly_life_summaries`
- local verification confirmed the aggregate aligned with the underlying domain summaries, with `health` as strongest and `spirituality` as weakest for the tested week
- authenticated clients do not have `EXECUTE` privileges on the weekly life-summary helper functions; life summary writes also remain backend-owned
- weekly orchestration helper functions now exist for:
  - upserting the previous closed weekly life summary for a single user
  - running a batch over onboarding-complete users for scheduled weekly summary generation
- the single-user orchestration helper derives the target week from the user's timezone and a reference UTC timestamp
- local verification confirmed that using a future reference timestamp correctly targeted the throwaway user's first scoring week (`2026-03-30`)
- local verification confirmed the batch helper returned the same weekly score (`63.72`) for the tested user
- authenticated clients do not have `EXECUTE` privileges on the weekly orchestration helper functions; scheduler-facing operations remain backend-owned

### Phase S5: Adapt the mobile app from Firebase client flows to Supabase client flows

Goal:
- connect the Expo app to the correct backend

Tasks:
- replace Firebase auth client with Supabase auth client
- replace Firestore reads/writes with Supabase queries or RPC calls
- replace callable function assumptions with Supabase RPC or Edge Function calls
- update service layer in `mobile/`

Important note:
- the UI module structure can stay mostly the same
- the data access layer changes the most

Exit criteria:
- mobile app can sign in, fetch profile state, and talk to the new backend

Current progress:
- the placeholder Firebase mobile client has been replaced with a Supabase client scaffold in `mobile/src/lib/supabase/client.ts`
- the mobile workspace now depends on:
  - `@supabase/supabase-js`
  - `@react-native-async-storage/async-storage`
  - `react-native-url-polyfill`
- the Supabase mobile client is configured for React Native session persistence with AsyncStorage and app-state-driven token refresh
- the Expo app shell is now wrapped in an `AuthSessionProvider` backed by Supabase auth
- the placeholder home screen reads and displays the current Supabase session state, so the app has a working session boundary before dedicated auth screens exist
- the mobile workspace installs cleanly and `npm run typecheck:mobile` still passes after the client-layer pivot

### Phase S6: Implement the shared scoring core and validate with SQL outputs

Goal:
- keep score math consistent across mobile preview and backend truth

Tasks:
- keep formulas in `shared/`
- decide whether the backend uses:
  - SQL-native formula logic only
  - or shared TypeScript logic mirrored in backend orchestration
- create test fixtures from the scoring design
- compare SQL outputs with shared utility outputs

Recommendation:
- authoritative weekly summary computation should live in the backend
- `shared/` should still be used for provisional client-side preview logic and test alignment

Exit criteria:
- mobile preview logic and backend official logic agree on known examples

Current progress:
- `shared/src/scoring.ts` now mirrors the backend formulas for:
  - weekly action targets
  - onboarding blend weights
  - action score
  - consistency score
  - missing-reflection reweighting
  - blended domain score
  - displayed score smoothing
  - evenness and life-level aggregation
- the shared package builds and typechecks successfully
- local parity verification confirmed the shared helpers matched the backend outputs for:
  - `health` weekly domain summary
  - `work_productivity` weekly domain summary
  - the corresponding weekly life summary aggregate

### Phase S7: Build product features in the same product order as before

Goal:
- continue feature development on the better backend foundation

Recommended order:
1. auth and onboarding
2. daily check-ins
3. journaling
4. work actions
5. health actions
6. finance actions
7. connection logs
8. weekly summaries
9. missions and streak

Exit criteria:
- the focused V1 loop works fully on Supabase

## Immediate practical recommendation

From the current repo state, the safest next three moves are:

1. stop further Firebase-specific coding
2. create the `supabase/` project structure and migration flow
3. rewrite the backend section of the technical blueprint around Supabase

## What can stay unchanged

These parts still fit the new direction:
- `mobile/` app structure
- `shared/` domain constants and score utilities
- score formulas and product decisions
- focused V1 scope
- offline-tolerant posture

## What should change

These parts need to be replaced or revised:
- Firebase config files
- Firestore rules and indexes
- Firebase Functions assumptions
- Firebase data access layer in the app
- Firebase-specific sections in the technical blueprint

## Recommendation summary

If VELORA is fundamentally a scoring and analytics product, the best implementation order is:

1. pivot backend now
2. establish Supabase schema and RLS early
3. make score generation relational and queryable from day one
4. adapt the mobile app onto that backend
5. then build feature modules on top of the correct data foundation

This is the cleanest path if future advice and analytics quality matter more than short-term Firebase convenience.
