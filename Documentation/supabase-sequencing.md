# VELORA Supabase Sequencing

Last updated: 2026-04-03

This document defines the recommended implementation sequence for VELORA if the product prioritizes:

- scoring correctness
- future analytics
- better long-term advice generation
- a relational backend data model

Under that priority, Supabase is the recommended backend direction.

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
- local application has not yet been verified because Docker is required for `supabase start` and is not available in the current environment

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
