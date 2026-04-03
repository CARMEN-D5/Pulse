# VELORA Functional Specification Document

Last updated: 2026-04-03

## 1. Purpose

This document defines VELORA’s functional behavior for Version 1. It describes system features, user actions, expected application behavior, and responsiveness requirements for the cross-platform mobile app.

Reference documents:
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/project-charter-prd.md`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/scoring-architecture-decisions.md`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/supabase-sequencing.md`

## 2. Product Context

VELORA is a mobile application for tracking and improving balance across:
- spirituality
- family and friends
- work/productivity
- health
- financial wellbeing

The app supports:
- daily reflections
- action logging
- weekly summaries
- long-term score visibility

## 3. User Roles

### 3.1 End User

The primary actor is the authenticated VELORA user who:
- signs in
- completes onboarding
- records check-ins and actions
- reviews weekly scores and history

### 3.2 System

The backend system:
- validates score-relevant inputs
- normalizes action events
- computes official weekly scores
- persists weekly summaries

## 4. Functional Modules

## 4.1 Authentication

### Purpose

Allow users to create an account, sign in securely, and maintain a persistent session.

### User actions

- create account with email and password
- sign in with email and password
- sign out

### System behavior

- create an authenticated user record
- create a linked profile record
- restore session on app reopen if a valid session exists
- route unauthenticated users to the auth flow

### Functional rules

- a user must be authenticated before accessing score-related features
- session persistence must work across app restarts

## 4.2 Onboarding

### Purpose

Collect initial setup data and create the user’s baseline for the five-domain model.

### User actions

- read welcome/value framing
- enter display name
- choose or confirm scoring timezone
- rate each of the five domains from `1` to `5`

### System behavior

- validate timezone input
- validate one rating per domain
- map onboarding ratings from `1..5` to `20..100`
- store one baseline record per domain
- mark onboarding as completed
- prevent duplicate onboarding submission in normal flow

### Functional rules

- onboarding must be completed before main scoring screens are considered active
- the onboarding baseline influences scores only during the 14-day bootstrap period

## 4.3 Daily Check-In

### Purpose

Capture daily reflection data per domain and support reflection and consistency scoring.

### User actions

- select one of the five domains
- submit a `1..5` daily check-in
- update the check-in for the same domain and local day if needed

### System behavior

- allow at most one daily check-in per domain per local scoring day
- map rating to `20..100`
- derive local scoring date and week start from the user’s timezone
- upsert the check-in rather than creating duplicates

### Functional rules

- missing check-ins do not count as `0`
- reflection score is averaged from actual check-ins only
- consistency is derived from days with daily check-ins in MVP

## 4.4 Dashboard

### Purpose

Provide a clear home view of current balance and recent weekly outcomes.

### User actions

- open the home screen
- review overall balance score
- review five domain scores
- tap into current week progress or official history
- use quick actions to start a check-in or action log

### System behavior

- display most recent official weekly summary if available
- display strongest and weakest domain highlights
- display latest domain-level scores
- show loading, empty, and error states clearly

### Functional rules

- official score display should use persisted weekly summaries
- current-week progress may be shown as provisional
- official summaries must remain backend-authoritative

## 4.5 Actions Hub

### Purpose

Provide access to all score-relevant activity modules from a single place.

### User actions

- open the actions hub
- select a module such as journal, tasks, or expense log

### System behavior

- navigate to the chosen feature module
- preserve a simple and predictable hub structure

## 4.6 Journal

### Purpose

Let the user record reflective journal entries for the Spirituality domain.

### User actions

- create a journal entry
- edit a journal entry
- browse previous entries

### System behavior

- require non-empty body text
- derive local scoring date from timestamp
- create one normalized `journal_entry` action event
- apply daily scoring cap of `1`
- update the normalized event safely if the entry is edited

## 4.7 Meaningful Connection Log

### Purpose

Let the user record meaningful social interactions for the Family/Friends domain.

### User actions

- log a connection with optional type, contact label, and note
- edit an existing connection log

### System behavior

- require at least one meaningful signal:
  - connection type
  - contact label
  - note
- derive local scoring date
- create one normalized `meaningful_connection_log` action event
- apply daily scoring cap of `2`
- update the normalized event safely if the log is edited

## 4.8 Tasks

### Purpose

Let the user manage important tasks for the Work/Productivity domain.

### User actions

- create a task
- update task title and notes
- mark a task as completed

### System behavior

- create a normalized `important_task_completed` action event only when the task first transitions to completed
- derive completion date from completion timestamp and scoring timezone
- apply daily scoring cap of `5`
- allow edits to task text after completion without generating duplicate score events
- prevent reverting a completed task back to pending for score integrity

## 4.9 Focus Sessions

### Purpose

Let the user track focused work sessions for the Work/Productivity domain.

### User actions

- start a focus session
- complete a focus session
- cancel a focus session

### System behavior

- compute duration from start and end times
- derive local scoring date from the completed session
- create one normalized `focus_session` action event only for completed sessions
- apply daily scoring cap of `4`
- prevent rewriting the timing of a completed session

## 4.10 Activity Logs

### Purpose

Let the user log exercise or movement for the Health domain.

### User actions

- create an activity log with activity type and optional duration, distance, and note
- edit an existing activity log

### System behavior

- require non-empty activity type
- derive local scoring date
- create or update one normalized `exercise_log` action event
- apply daily scoring cap of `2`

## 4.11 Sleep Logs

### Purpose

Let the user track sleep for the Health domain.

### User actions

- log sleep start and sleep end
- update a sleep log if corrected later

### System behavior

- compute duration from sleep start and sleep end
- assign the sleep record to the wake-up day
- derive local scoring date from `sleep_end_utc`
- create or update one normalized `sleep_log` action event
- apply daily scoring cap of `1`

## 4.12 Expense Logs

### Purpose

Let the user log expenses for the Financial Wellbeing domain.

### User actions

- create an expense log
- edit an expense log

### System behavior

- require positive amount
- require 3-letter uppercase currency code
- require non-empty category
- derive local scoring date
- create or update one normalized `expense_log` action event
- apply daily scoring cap of `5`

## 4.13 Budget Review or Savings Actions

### Purpose

Let the user log budget review or savings actions for the Financial Wellbeing domain.

### User actions

- create a financial action with an action kind
- optionally add amount and note
- edit the action later if corrected

### System behavior

- require non-empty action kind
- require amount to be positive if provided
- derive local scoring date
- create or update one normalized `budget_review_or_savings_action` event
- apply daily scoring cap of `1`

## 4.14 Weekly Summary and History

### Purpose

Show official weekly outcomes and historical score movement.

### User actions

- open weekly summary list
- open a weekly summary detail view
- browse domain history and recent progress

### System behavior

- read official weekly summaries from persisted backend records
- display:
  - life strength
  - evenness
  - balanced life score
  - strongest domain
  - weakest domain
- display domain-level score breakdowns

### Functional rules

- weekly summaries must be generated on the backend
- weekly summaries should be marked provisional when the week is incomplete or partial
- history screens should not recompute official historical scores on the client

## 4.15 Missions and Streak

### Purpose

Provide motivation and guidance while keeping the product focused.

### User actions

- view weekly missions
- mark missions complete
- view streak count

### System behavior

- present lightweight domain-based missions
- update streak state from qualifying behavior
- surface streak status in the UI

### Functional rules

- missions should guide action, not redefine score truth
- streaks should be motivating, not a separate scoring system

## 4.16 Profile and Settings

### Purpose

Allow users to manage safe account-level preferences.

### User actions

- view profile details
- view scoring timezone
- sign out

### System behavior

- allow safe non-scoring profile edits
- display timezone information clearly
- preserve the fixed scoring timezone rule unless deliberately changed

## 5. Scoring-Related Functional Rules

### 5.1 Reflection

- one daily check-in per domain per day
- reflection score uses recorded check-ins only
- missing days are ignored

### 5.2 Action Score

- only accepted normalized action events contribute to action score
- action score is capped at `100`

### 5.3 Consistency

- in MVP, consistency is derived from days with daily check-ins
- consistency is computed using active days in the scoring window

### 5.4 Weekly Domain Score

- standard formula:

```text
CurrentComputedScore = 0.3R + 0.4A + 0.3C
```

- missing-reflection formula:

```text
CurrentComputedScore = (0.4A + 0.3C) / 0.7
```

- displayed score smoothing:

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * BlendedComputedScore_t
```

## 6. Responsiveness Requirements

### 6.1 Device Responsiveness

- the app must work across common iOS and Android phone sizes
- layouts must remain readable in portrait mode across small and large devices
- content must avoid clipping, overlapping, or hidden primary actions

### 6.2 Interaction Responsiveness

- button taps and form responses should feel immediate
- pending or loading actions must show visible feedback
- score-relevant writes should show success, pending-sync, or error state clearly

### 6.3 Network Responsiveness

- the app is offline-tolerant, not offline-first
- cached content may be shown when connectivity is poor
- locally-entered inputs may queue and sync later
- official weekly summaries remain server-confirmed

### 6.4 Performance Expectations

- home dashboard should open from cached state without blocking on full network refresh
- forms should submit without long unexplained delays
- summary and history screens should use skeleton or loading placeholders instead of blank states

## 7. Error and Empty States

- unauthenticated user: route to auth flow
- onboarding incomplete: route to onboarding stack
- no weekly summaries yet: explain that the first official summary appears after enough data is collected
- offline write pending: show sync/pending state
- backend rejection: show actionable message where possible

## 8. Accessibility and Usability Expectations

- text must remain readable on small mobile screens
- touch targets should be large enough for comfortable use
- color should not be the only indicator of score state
- flows should avoid requiring long forms for daily use

## 9. Functional Summary

VELORA Version 1 is a score-centered mobile application with daily-use simplicity and weekly-review depth. The system must support reliable data entry, trustworthy score generation, and clear responsiveness under normal and temporarily degraded network conditions.
