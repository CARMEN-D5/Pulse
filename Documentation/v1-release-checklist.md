# V1 Release Checklist

Use this checklist before calling the VELORA Version 1 branch pilot-ready.

## 1. Local runtime

- Run `npm install` from the repo root.
- Start the local backend with `npm run supabase:start`.
- Confirm `mobile/.env` contains valid local Supabase values.
- Run `npm run qa:v1:local` and confirm it passes.

## 2. Manual mobile flow

- Launch the app with `npm run dev:mobile`.
- Create a new account with email and password.
- Confirm the app routes to onboarding after sign-up.
- Complete onboarding with display name, timezone, and all five domain ratings.
- Confirm the app routes into the main tabs after onboarding.
- Restart the app and confirm the session restores without logging in again.

## 3. Daily check-in and dashboard

- Submit all five domain check-ins for today.
- Re-open today’s check-in and edit at least one domain rating.
- Confirm the Home screen loads:
  - balanced life score card
  - strongest and weakest domain cards
  - current streak card
  - balance wheel visual
- Confirm the Summary screen loads:
  - weekly history
  - selected week detail
  - domain breakdown
  - recent domain trend cards

## 4. Action modules

- Create or update at least one record in each V1 action module:
  - journal entry
  - connection log
  - task
  - focus session
  - activity log
  - sleep log
  - expense log
  - financial action
- Confirm the supported edit/delete flows behave as expected.
- Confirm completed tasks cannot be reverted incorrectly.
- Confirm focus sessions can be completed or cancelled cleanly.

## 5. Backend integrity

- Confirm the required tables exist through the QA script.
- Confirm `complete_onboarding(...)` exists.
- Confirm `submit_daily_checkin(...)` exists.
- Confirm `run_weekly_summary_scheduler(...)` exists.
- Confirm the `velora-weekly-summary-hourly` cron job exists and is active.
- Confirm the seed data exists for:
  - 5 domains
  - V1 action rules

## 6. Release confidence checks

- Confirm `Documentation/VELORA_V1_Product_Backlog.xlsx` reflects current progress.
- Confirm the active docs align with the shipped branch behavior:
  - `project-charter-prd.md`
  - `functional-specification-document.md`
  - `ui-ux-design-document.md`
  - `technical-architecture-document.md`
  - `scoring-architecture-decisions.md`
  - `mvp-technical-blueprint.md`
  - `supabase-sequencing.md`
- Confirm no unintended files are staged before release or push.

## 7. Not part of V1 release sign-off

These remain out of scope for the current V1 pilot:

- missions
- AI features
- social/community
- photos
- calorie tracking
- wearable integrations
