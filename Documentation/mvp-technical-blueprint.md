# VELORA MVP Technical Blueprint

Last updated: 2026-04-02

This document turns the agreed scoring and product decisions into an implementation blueprint for the MVP.

Important note:
- this blueprint currently contains a Firebase-first backend implementation path from earlier planning
- the project is now pivoting toward a Supabase-first backend because scoring and analytics have become the higher priority
- use `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/supabase-sequencing.md` as the active backend sequencing reference until this blueprint is fully rewritten around Supabase

Reference sources:
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/Balanced Life.docx`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/Scenarios&UserStory.md`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/scoring-architecture-decisions.md`

## Progress

Locked in this document:
- Step 1: backend architecture and schema blueprint
- Step 2: API contracts
- Step 3: scoring computation flow and background jobs
- Step 4: cross-platform mobile module map
- Step 5: implementation sequencing, task breakdown, and repository setup

Planned next:
- repository scaffolding and Phase 1 execution

## Step 1: Backend Architecture and Schema Blueprint

### Recommended backend choice

For MVP, the recommended backend is:
- `Firebase Auth` for authentication
- `Cloud Firestore` for primary application data
- `Cloud Functions for Firebase` for validation, score-event normalization, and score generation
- `Cloud Scheduler` for weekly summary jobs
- `Cloud Storage` for optional media uploads such as hobby photos later

Why this is a good fit:
- fast MVP delivery for mobile-first products
- strong React Native support
- built-in auth and secure token flow
- flexible document model for feature iteration
- good fit for event capture, summary documents, and future push notifications

Important tradeoff:
- Firestore is not relational
- joins, unique constraints, and heavy aggregations are weaker than in Postgres
- because of that, VELORA should rely on deterministic document IDs, denormalized summary documents, and server-side Cloud Functions for score authority

The data model below is therefore written as a Firebase-native collection and document design while preserving the same scoring architecture decisions.

### Core architecture principles

1. Backend is authoritative for scores
- mobile clients submit events
- backend validates events and computes scores
- clients never submit authoritative domain or balance scores

2. Structured scoring inputs are separate from sensitive raw content
- scoring reads daily check-ins, normalized action events, and summary documents
- journaling and free-text notes remain separate

3. Time is stored in UTC, scored in user timezone
- timestamps are stored as UTC
- scoring windows are computed from the user's fixed `scoring_timezone`

4. Weekly summaries are explicit persisted records
- the app should not recompute all historical weeks on the fly
- summary documents make charts, history, and weekly insights faster and easier to audit

### Data domains

VELORA has five fixed score domains:
- `spirituality`
- `family_friends`
- `work_productivity`
- `health`
- `financial_wellbeing`

These should be represented by a top-level collection or a strict shared enum so the backend and mobile app always use the same identifiers.

### Firebase collection layout

Recommended top-level collections:
- `domains`
- `actionRules`
- `missions`
- `users`

Recommended user-owned subcollections under `users/{userId}`:
- `domainBaselines`
- `dailyCheckins`
- `actionEvents`
- `journalEntries`
- `connectionLogs`
- `userMissions`
- `tasks`
- `focusSessions`
- `activityLogs`
- `sleepLogs`
- `expenseLogs`
- `financialActions`
- `weeklyDomainSummaries`
- `weeklyLifeSummaries`

This keeps each user's data grouped naturally for security rules and app queries.

## 1. Identity and Profile Layer

### `users/{userId}`

Purpose:
- stores application-level user settings and scoring configuration

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, same as Firebase Auth uid |
| `displayName` | `string` | optional profile name |
| `scoringTimezone` | `string` | fixed IANA timezone, for example `Australia/Sydney` |
| `createdAt` | `timestamp` | record creation time |
| `updatedAt` | `timestamp` | record update time |
| `onboardingCompletedAt` | `timestamp` | when the baseline flow was completed |
| `currentStreakDays` | `number` | optional derived field for fast UI display |

Key rules:
- `scoringTimezone` is required
- the document id must equal the Firebase Auth uid

### `domains/{domainKey}`

Purpose:
- canonical domain list

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `key` | `string` | document id or duplicated field, one of the five domain identifiers |
| `label` | `string` | human-readable name |
| `sortOrder` | `number` | stable UI ordering |
| `isActive` | `boolean` | future flexibility without schema changes |

## 2. Onboarding Baseline Layer

### `users/{userId}/domainBaselines/{domainKey}`

Purpose:
- stores the initial domain self-ratings from onboarding
- supports the 14-day bootstrap decay model

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, recommended to equal `domainKey` |
| `domainKey` | `string` | one of the fixed domain identifiers |
| `initialRatingValue` | `number` | `1..5` |
| `initialRatingScore` | `number` | mapped `20..100` |
| `createdAt` | `timestamp` | onboarding submission time |

Document rule:
- use one baseline document per domain
- document id = `domainKey`
- validate `initialRatingValue` in Cloud Functions or Security Rules

## 3. Reflection Layer

### `users/{userId}/dailyCheckins/{domainKey_yyyy_mm_dd}`

Purpose:
- stores one daily reflection per domain per local scoring day
- drives both reflection score and consistency score in the MVP

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, recommended pattern `domainKey_yyyy-mm-dd` |
| `domainKey` | `string` | one of the fixed domain identifiers |
| `ratingValue` | `number` | `1..5` |
| `ratingScore` | `number` | mapped `20..100` |
| `occurredAtUtc` | `timestamp` | event timestamp in UTC |
| `localEventDate` | `string` | local date in ISO form, for example `2026-04-02` |
| `weekStartLocalDate` | `string` | Monday of the relevant scoring week |
| `createdAt` | `timestamp` | row creation time |
| `updatedAt` | `timestamp` | last update time |

Document rule:
- one daily check-in document per domain per local day
- document id enforces uniqueness naturally
- recommended id = `domainKey_yyyy-mm-dd`

Why this collection matters:
- keeps the "one check-in per domain per day" rule enforceable
- gives direct support for the agreed reflection formula
- supports the simplified MVP consistency formula:

```text
Consistency = DaysWithDailyCheckIn / WindowDays * 100
```

## 4. Action and Score-Input Layer

### Design recommendation

For MVP, action-related features should use a two-layer pattern:

1. feature-specific collections hold rich app data
2. a normalized `actionEvents` ledger holds the score-relevant record

This is the cleanest architecture because:
- app features can evolve independently
- scoring logic stays consistent
- privacy boundaries are easier to maintain
- auditing is easier when score input is normalized

### `actionRules/{actionType}`

Purpose:
- stores server-side scoring rules by action type
- avoids hardcoding every point rule into the mobile app

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, for example `journal_entry` |
| `actionType` | `string` | duplicated field if helpful |
| `domainKey` | `string` | one of the domain identifiers |
| `basePoints` | `number` | points awarded before normalization |
| `maxScoredPerDay` | `number` | anti-gaming cap |
| `requiresNonemptyContent` | `boolean` | validation flag |
| `requiresUniqueReference` | `boolean` | validation flag |
| `isEnabled` | `boolean` | feature flag |
| `createdAt` | `timestamp` | row creation time |
| `updatedAt` | `timestamp` | row update time |

Examples:
- `journal_entry` -> `spirituality` -> `50`
- `focus_session` -> `work_productivity` -> `25`
- `expense_log` -> `financial_wellbeing` -> `25`

### `users/{userId}/actionEvents/{eventId}`

Purpose:
- canonical score-input ledger for non-check-in actions
- records what the scoring engine accepted, rejected, or capped

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, server-assigned or derived from `dedupeKey` |
| `domainKey` | `string` | one of the domain identifiers |
| `actionType` | `string` | logical reference to `actionRules` |
| `sourceCollection` | `string` | for example `expenseLogs` |
| `sourceRecordId` | `string` | record that produced the event |
| `occurredAtUtc` | `timestamp` | event timestamp in UTC |
| `localEventDate` | `string` | local day in scoring timezone |
| `weekStartLocalDate` | `string` | Monday of the scoring week |
| `dedupeKey` | `string` | unique or near-unique anti-duplication key |
| `payloadSummary` | `map` | structured non-sensitive event summary only |
| `validationStatus` | `string` | for example `accepted`, `duplicate`, `invalid`, `capped` |
| `awardedPoints` | `number` | points actually counted toward the week |
| `wasDuplicate` | `boolean` | explicit audit flag |
| `wasCapped` | `boolean` | explicit audit flag |
| `rejectionReason` | `string` | optional explanation |
| `createdAt` | `timestamp` | row creation time |

Document rules:
- `actionEvents` should be server-managed only
- when uniqueness matters, use a deterministic document id derived from `dedupeKey`
- otherwise store `dedupeKey` as a field and let Cloud Functions decide whether the event is accepted

Important MVP note:
- action events contribute to `A` only
- consistency is currently derived from `dailyCheckins`, not from `actionEvents`

## 5. Feature Collections

These collections support the product experience. They may create one or more normalized `actionEvents`, but they should remain separate from the score ledger.

### Recommended MVP feature collections

#### `users/{userId}/journalEntries/{entryId}`

Purpose:
- stores private reflection content for journaling

Recommended fields:
- `id`
- `domainKey`
- `title`
- `body`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`
- `updatedAt`

Privacy note:
- raw journal text must not be sent into analytics pipelines

#### `users/{userId}/connectionLogs/{logId}`

Purpose:
- stores family and friends interaction logs

Recommended fields:
- `id`
- `connectionType`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

#### `missions/{missionId}`

Purpose:
- catalog of domain-specific prompts, challenges, or guidance missions

Recommended fields:
- `id`
- `domainKey`
- `title`
- `description`
- `difficulty`
- `isActive`
- `createdAt`

#### `users/{userId}/userMissions/{assignmentId}`

Purpose:
- assignment and completion state of missions per user

Recommended fields:
- `id`
- `missionId`
- `status`
- `assignedAt`
- `completedAt`

#### `users/{userId}/tasks/{taskId}`

Purpose:
- work or life tasks used for completion-based scoring and productivity UX

Recommended fields:
- `id`
- `title`
- `domainKey`
- `status`
- `dueDate`
- `completedAt`
- `createdAt`
- `updatedAt`

#### `users/{userId}/focusSessions/{sessionId}`

Purpose:
- captures work/productivity focus blocks

Recommended fields:
- `id`
- `startedAtUtc`
- `endedAtUtc`
- `durationMinutes`
- `status`
- `createdAt`

#### `users/{userId}/activityLogs/{logId}`

Purpose:
- captures health movement or exercise actions

Recommended fields:
- `id`
- `activityType`
- `durationMinutes`
- `distanceKm`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

#### `users/{userId}/sleepLogs/{logId}`

Purpose:
- captures daily sleep data

Recommended fields:
- `id`
- `sleepStartUtc`
- `sleepEndUtc`
- `durationMinutes`
- `localEventDate`
- `createdAt`

#### `users/{userId}/expenseLogs/{logId}`

Purpose:
- captures finance tracking entries

Recommended fields:
- `id`
- `amount`
- `currencyCode`
- `category`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

#### `users/{userId}/financialActions/{actionId}`

Purpose:
- captures budget review or savings actions

Recommended fields:
- `id`
- `actionKind`
- `amount`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

## 6. Weekly Summary Layer

### `users/{userId}/weeklyDomainSummaries/{weekStart_domainKey}`

Purpose:
- persisted per-domain weekly score record
- foundation for history, charts, and score explanation

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, recommended pattern `yyyy-mm-dd_domainKey` |
| `domainKey` | `string` | one of the domain identifiers |
| `weekStartLocalDate` | `string` | Monday of scoring week |
| `weekEndLocalDate` | `string` | Sunday of scoring week |
| `activeDaysInWindow` | `number` | `7` normally, smaller for first partial week |
| `reflectionDaysCount` | `number` | number of daily check-ins in window |
| `reflectionScore` | `number` | nullable if no reflection data |
| `actionPointsEarned` | `number` | accepted points before normalization |
| `actionTargetPoints` | `number` | normal or prorated target |
| `actionScore` | `number` | capped `0..100` |
| `consistencyDaysCount` | `number` | number of check-in days in window |
| `consistencyScore` | `number` | `0..100` |
| `currentComputedScore` | `number` | authoritative weekly domain score |
| `blendedComputedScore` | `number` | after onboarding decay, nullable post-expiry |
| `displayedScore` | `number` | smoothed score shown to the user |
| `bootstrapWeightUsed` | `number` | for example `0.70`, `0.40`, `0.20`, `0.00` |
| `observedWeightUsed` | `number` | complementary to bootstrap |
| `usedReflectionReweighting` | `boolean` | true when `R` was null |
| `isProvisional` | `boolean` | first partial week marker |
| `finalizedAt` | `timestamp` | when this summary became official |
| `createdAt` | `timestamp` | row creation time |
| `updatedAt` | `timestamp` | row update time |

Document rule:
- one summary document per domain per week
- recommended doc id = `weekStartLocalDate_domainKey`

### `users/{userId}/weeklyLifeSummaries/{weekStart}`

Purpose:
- persisted whole-life weekly summary across all five domains

Recommended fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | document id, recommended pattern `yyyy-mm-dd` |
| `weekStartLocalDate` | `string` | Monday of scoring week |
| `weekEndLocalDate` | `string` | Sunday of scoring week |
| `lifeStrength` | `number` | average of the five domain scores |
| `evenness` | `number` | `100 - 2 * standard_deviation` clamped to `0..100` |
| `balancedLifeScore` | `number` | final weekly score |
| `strongestDomainKey` | `string` | optional UI convenience |
| `weakestDomainKey` | `string` | optional UI convenience |
| `isProvisional` | `boolean` | mirrors first-week behavior |
| `finalizedAt` | `timestamp` | summary freeze time |
| `createdAt` | `timestamp` | row creation time |
| `updatedAt` | `timestamp` | row update time |

Document rule:
- one life summary document per scoring week
- recommended doc id = `weekStartLocalDate`

## 7. Relationships and Data Flow

Recommended Firebase data flow:

1. user completes onboarding
- create `users/{userId}`
- create five `domainBaselines` documents

2. user submits daily check-in
- write to `users/{userId}/dailyCheckins/{domainKey_yyyy-mm-dd}`

3. user performs a feature action
- write to a user feature collection such as `expenseLogs` or `focusSessions`
- Cloud Functions validate the write and emit a server-owned `actionEvents` document if appropriate

4. weekly scoring job runs
- read `dailyCheckins`, `actionEvents`, and `domainBaselines`
- compute five `weeklyDomainSummaries`
- compute one `weeklyLifeSummaries`

## 8. Privacy and Security Model

Schema design must reflect the agreed privacy rules:

- raw sensitive content stays in dedicated feature collections
- normalized score inputs stay in `dailyCheckins` and `actionEvents`
- analytics should use summary documents and structured event metadata only
- every user-owned document lives under `users/{userId}`
- Firebase Security Rules should default to "user can only access own documents"
- derived score documents should be server-managed and not client-writable

Collections with highest sensitivity:
- `journalEntries`
- note fields in `connectionLogs`
- note fields in `expenseLogs`
- note fields in `financialActions`

These collections should be treated more cautiously than score summaries.

## 9. Recommended Firestore Indexes and ID Strategies

Minimum useful Firestore indexes:

- `dailyCheckins`: `weekStartLocalDate asc, domainKey asc`
- `actionEvents`: `weekStartLocalDate asc, domainKey asc`
- `actionEvents`: `localEventDate asc, actionType asc`
- `weeklyDomainSummaries`: `weekStartLocalDate desc`
- `weeklyLifeSummaries`: `weekStartLocalDate desc`

Recommended deterministic document ids:

- `domainBaselines/{domainKey}`
- `dailyCheckins/{domainKey_yyyy-mm-dd}`
- `weeklyDomainSummaries/{weekStartLocalDate_domainKey}`
- `weeklyLifeSummaries/{weekStartLocalDate}`

When action uniqueness matters:
- use a deterministic `actionEvents` document id from `dedupeKey`
- or use a transaction that checks whether a matching `dedupeKey` already exists

## 10. Why This Schema Is the Right MVP Shape

This schema is intentionally opinionated:
- simple enough for an MVP
- structured enough for deterministic scoring
- safe enough for sensitive user data
- extensible enough for future AI features

Most importantly, it prevents VELORA from coupling score logic directly to free-text content or mobile-only logic. That gives the system a stable Firebase backend core while leaving room for richer coaching, summaries, notifications, and AI features after the MVP.

## Step 2: API Contracts

### Contract philosophy

For Firebase, the cleanest MVP contract is a hybrid model:

1. use `Firebase Auth` for identity
2. use direct Firestore reads for app data and summaries
3. use direct Firestore writes for user-owned feature content where ownership is simple
4. use callable Cloud Functions for scoring-critical mutations and multi-document workflows
5. keep derived score collections server-managed only

This gives VELORA:
- a simple mobile developer experience
- strong server authority for scoring
- fewer chances for client-side tampering
- room to grow without redesigning the app layer

### Contract categories

The MVP should use three contract types:

1. Client SDK contracts
- Firebase Auth
- Firestore reads
- selected Firestore writes to user-owned feature collections

2. Callable Cloud Function contracts
- onboarding completion
- daily check-in submission
- any future workflow requiring validation across multiple documents

3. Internal server contracts
- Firestore triggers
- scheduled weekly summary generation
- admin-only rebuild or repair functions

## 2.1 Auth Contracts

### Recommended MVP auth methods

Use:
- email and password

Future additions:
- Google sign-in
- Apple sign-in

### Auth flow

1. user signs up with Firebase Auth
2. `onAuthCreate` trigger creates `users/{userId}` with minimal defaults
3. app requires onboarding before score features are fully enabled

### `onAuthCreate` server behavior

Creates:
- `users/{userId}` with:
  - `createdAt`
  - `updatedAt`
  - `currentStreakDays = 0`
  - `onboardingCompletedAt = null`

No client payload is required beyond the Firebase Auth signup flow.

## 2.2 Profile Contracts

### Client-readable profile document

Path:
- `users/{userId}`

Readable by:
- the authenticated owner only

Client-writable fields in MVP:
- `displayName`

Server-managed fields:
- `scoringTimezone`
- `onboardingCompletedAt`
- `currentStreakDays`
- `createdAt`
- `updatedAt`

Architectural note:
- `scoringTimezone` affects scoring windows and should not be freely client-editable in MVP
- set it during onboarding through a callable function

## 2.3 Onboarding Contract

### Callable function: `completeOnboarding`

Purpose:
- finalize the user's initial setup
- store the fixed scoring timezone
- store the five onboarding baseline ratings

Request:

```json
{
  "displayName": "Maria",
  "scoringTimezone": "Australia/Sydney",
  "initialRatings": {
    "spirituality": 3,
    "family_friends": 4,
    "work_productivity": 2,
    "health": 3,
    "financial_wellbeing": 2
  }
}
```

Validation rules:
- caller must be authenticated
- `scoringTimezone` must be a valid IANA timezone
- all five domains must be present exactly once
- all values must be integers in `1..5`
- onboarding should run only once in normal MVP flow

Server behavior:
- update `users/{userId}`
- set `displayName` if provided
- set `scoringTimezone`
- set `onboardingCompletedAt`
- create five `domainBaselines` documents

Response:

```json
{
  "ok": true,
  "onboardingCompleted": true
}
```

## 2.4 Daily Check-in Contract

### Callable function: `submitDailyCheckin`

Purpose:
- submit or update the user's daily reflection for one domain
- enforce one check-in per domain per local scoring day
- keep reflection and consistency scoring server-trustworthy

Request:

```json
{
  "domainKey": "health",
  "ratingValue": 4,
  "occurredAtUtc": "2026-04-02T08:15:00.000Z"
}
```

Validation rules:
- caller must be authenticated
- onboarding must be complete
- `domainKey` must be one of the five supported domains
- `ratingValue` must be an integer in `1..5`
- `occurredAtUtc` must not be unreasonably far in the future

Server behavior:
- load the user's `scoringTimezone`
- derive `localEventDate`
- derive `weekStartLocalDate`
- map `ratingValue` to `ratingScore`
- upsert `users/{userId}/dailyCheckins/{domainKey_yyyy-mm-dd}`

Response:

```json
{
  "ok": true,
  "documentId": "health_2026-04-02",
  "localEventDate": "2026-04-02",
  "ratingScore": 80
}
```

Why this is a callable function instead of a client write:
- the server must control timezone-based uniqueness
- the server must normalize `ratingScore`
- the server must prevent clients from forging derived score fields

## 2.5 Feature Content Contracts

### General rule

The mobile client may write directly to user-owned feature collections when:
- ownership is simple
- the write affects only the current user
- server-side score normalization can happen asynchronously through Cloud Functions

The client must never write:
- `actionEvents`
- `weeklyDomainSummaries`
- `weeklyLifeSummaries`
- `actionRules`

### Common client-write contract pattern

For user feature collections:
- create documents under `users/{userId}/...`
- include only user-facing and feature-facing fields
- do not include awarded score points or final score fields
- let Cloud Functions decide whether a score event should be created

### `journalEntries`

Path:
- `users/{userId}/journalEntries/{entryId}`

Client-writable fields:
- `domainKey`
- `title`
- `body`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`
- `updatedAt`

Expected scoring behavior:
- `onCreate` trigger validates content
- if valid for scoring, emit one `actionEvents` document of type `journal_entry`

### `connectionLogs`

Path:
- `users/{userId}/connectionLogs/{logId}`

Client-writable fields:
- `connectionType`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

Expected scoring behavior:
- `onCreate` trigger may emit `meaningful_connection_log`

### `tasks`

Path:
- `users/{userId}/tasks/{taskId}`

Client-writable fields:
- `title`
- `domainKey`
- `status`
- `dueDate`
- `completedAt`
- `createdAt`
- `updatedAt`

Expected scoring behavior:
- only transitions into completed state should create a score event
- repeated edits must not create duplicate score events

### `focusSessions`

Path:
- `users/{userId}/focusSessions/{sessionId}`

Client-writable fields:
- `startedAtUtc`
- `endedAtUtc`
- `durationMinutes`
- `status`
- `createdAt`

Expected scoring behavior:
- only completed sessions should emit `focus_session`

### `activityLogs`

Path:
- `users/{userId}/activityLogs/{logId}`

Client-writable fields:
- `activityType`
- `durationMinutes`
- `distanceKm`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

Expected scoring behavior:
- valid records may emit `exercise_log`

### `sleepLogs`

Path:
- `users/{userId}/sleepLogs/{logId}`

Client-writable fields:
- `sleepStartUtc`
- `sleepEndUtc`
- `durationMinutes`
- `localEventDate`
- `createdAt`

Expected scoring behavior:
- valid records may emit `sleep_log`

### `expenseLogs`

Path:
- `users/{userId}/expenseLogs/{logId}`

Client-writable fields:
- `amount`
- `currencyCode`
- `category`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

Expected scoring behavior:
- valid records may emit `expense_log`

### `financialActions`

Path:
- `users/{userId}/financialActions/{actionId}`

Client-writable fields:
- `actionKind`
- `amount`
- `note`
- `occurredAtUtc`
- `localEventDate`
- `createdAt`

Expected scoring behavior:
- valid records may emit `budget_review_or_savings_action`

### `userMissions`

Path:
- `users/{userId}/userMissions/{assignmentId}`

Client-writable fields:
- `status`
- `completedAt`

Server-managed fields:
- mission assignment payload
- domain metadata copied from `missions`

Expected scoring behavior:
- only valid completion transitions should emit score events

## 2.6 Normalized Action Event Contracts

### Cloud Function trigger pattern

For each score-relevant feature collection:
- a Firestore trigger validates the source document
- the trigger computes the relevant `dedupeKey`
- the trigger creates or upserts a server-managed `actionEvents` document

Recommended trigger shape:
- `onCreate` for append-only collections like `expenseLogs`
- `onWrite` or `onUpdate` when score relevance depends on state transition, such as completing a task

### `actionEvents` creation rules

Each normalized score event should include:
- `domainKey`
- `actionType`
- `sourceCollection`
- `sourceRecordId`
- `occurredAtUtc`
- `localEventDate`
- `weekStartLocalDate`
- `dedupeKey`
- `validationStatus`
- `awardedPoints`
- `wasDuplicate`
- `wasCapped`
- `rejectionReason`
- `createdAt`

Only the backend may create or update these documents.

## 2.7 Summary Read Contracts

### Weekly domain summaries

Path:
- `users/{userId}/weeklyDomainSummaries`

Read usage:
- latest weekly score per domain
- history charts
- domain detail screens

Recommended query pattern:
- filter or order by `weekStartLocalDate`
- fetch latest 8 to 12 weeks for history screens

### Weekly life summaries

Path:
- `users/{userId}/weeklyLifeSummaries`

Read usage:
- home dashboard
- balance wheel input
- weekly recap

Recommended query pattern:
- order by `weekStartLocalDate desc`
- limit for dashboard and history pages

### Action rules and domains

Paths:
- `actionRules`
- `domains`
- `missions`

Read access:
- authenticated read-only

These collections can be cached locally because they change infrequently.

## 2.8 Internal Server Contracts

### Scheduled job: `finalizeWeeklyScores`

Purpose:
- compute official weekly summaries

Invocation:
- Cloud Scheduler

Behavior:
- find users whose local scoring week has just ended
- compute five `weeklyDomainSummaries`
- compute one `weeklyLifeSummaries`
- mark records finalized

This function is internal only.

### Admin or maintenance function: `rebuildWeeklyScores`

Purpose:
- repair or recompute weekly summaries for one user or one date range

Use cases:
- bug fixes
- data repair
- rule migration

This function must not be public to normal users.

### Optional internal function: `refreshCurrentStreak`

Purpose:
- update `users/{userId}.currentStreakDays`

Possible triggers:
- after daily check-in
- after weekly summary generation

This can remain internal even if the mobile app displays streaks.

## 2.9 Security Rule Boundaries

Recommended Firebase Security Rules posture:

Client readable and writable by owner:
- `users/{userId}`
  - limited to allowed profile fields
- feature collections under `users/{userId}`
  - `journalEntries`
  - `connectionLogs`
  - `tasks`
  - `focusSessions`
  - `activityLogs`
  - `sleepLogs`
  - `expenseLogs`
  - `financialActions`
  - `userMissions` with restricted writable fields

Client readable, server writable:
- `domainBaselines`
- `dailyCheckins`
- `actionEvents`
- `weeklyDomainSummaries`
- `weeklyLifeSummaries`

Authenticated read-only:
- `domains`
- `actionRules`
- `missions`

Server-only:
- internal maintenance collections if added later

### Security rule design note

If a collection affects score truth, prefer server writes.

This is the most important boundary in the whole Firebase contract design.

## 2.10 API Design Recommendation Summary

For MVP, use this contract split:

- Firebase Auth for sign-up and sign-in
- callable functions for:
  - `completeOnboarding`
  - `submitDailyCheckin`
- direct Firestore writes for feature content
- Cloud Functions triggers for normalized score events
- scheduled/internal functions for weekly score finalization
- read-only derived summary collections for the mobile app

This is the cleanest Firebase contract shape for VELORA because it keeps the mobile app productive without giving the client authority over score truth.

## Step 3: Scoring Computation Flow and Background Jobs

### Goal

VELORA needs a score pipeline that is:
- deterministic
- auditable
- timezone-correct
- difficult for clients to tamper with
- simple enough to operate in Firebase

The most important design rule is:
- official weekly scores are produced only by the backend

### Recommended score-engine shape

Use one shared pure scoring module for all formula logic.

Recommended implementation:
- a shared TypeScript scoring library used by:
  - Cloud Functions for official weekly summaries
  - the mobile app for optional provisional current-week preview

This avoids duplicating formulas in multiple places and reduces the risk of drift between client preview and backend official score generation.

### Core scoring pipeline

The end-to-end flow should look like this:

1. user completes onboarding
- store domain baselines
- store fixed scoring timezone

2. user submits daily check-in
- callable function normalizes and upserts `dailyCheckins`

3. user writes feature data
- client writes to user-owned feature collection
- Cloud Function validates the write
- if valid, backend emits `actionEvents`

4. current week preview is derived
- optional client preview can be calculated from current-week raw data using the shared scoring module
- preview is not authoritative

5. week closes in the user's scoring timezone
- scheduled backend job computes official weekly domain summaries
- scheduled backend job computes official weekly life summary
- results are persisted into summary collections

6. official summaries become the source for charts and history

## 3.1 Window Resolution Rules

Every score calculation must begin by resolving the correct local scoring window.

Inputs:
- `occurredAtUtc`
- user `scoringTimezone`

Rules:
- convert UTC timestamps into the user's fixed scoring timezone
- local scoring day = `00:00:00` to `23:59:59`
- scoring week = Monday through Sunday
- first week may be partial from signup day to that week's Sunday

Derived values:
- `localEventDate`
- `weekStartLocalDate`
- `weekEndLocalDate`
- `activeDaysInWindow`

These derived values must be calculated consistently everywhere by the shared score module or a shared utility module.

## 3.2 Reflection Computation

For each domain and scoring week:

1. gather all `dailyCheckins` in the window for that domain
2. count `reflectionDaysCount`
3. map each rating to `20..100`
4. compute:

```text
R = average(recorded reflection scores)
```

Rules:
- one check-in per domain per local day
- missing days are ignored
- if no check-ins exist for the week, `R = null`

## 3.3 Action Computation

For each domain and scoring week:

1. gather all accepted `actionEvents` in the window for that domain
2. sum `awardedPoints`
3. choose the correct weekly target:
   - normal weekly target for a full week
   - prorated target for a first partial week
4. compute:

```text
A = min((PointsEarned / ActionTargetPoints) * 100, 100)
```

Where weekly targets are:
- spirituality: `200`
- family_friends: `200`
- work_productivity: `250`
- health: `300`
- financial_wellbeing: `200`

Partial first week:

```text
ProratedActionTarget = NormalWeeklyTarget * (ActiveDays / 7)
```

Important rule:
- only `actionEvents` with `validationStatus = accepted` contribute to `PointsEarned`

## 3.4 Consistency Computation

For MVP, consistency comes only from daily check-ins.

For each domain and scoring week:

```text
C = (DaysWithDailyCheckIn / WindowDays) * 100
```

Where:
- `WindowDays = 7` for a full week
- `WindowDays = ActiveDays` for the first partial week

Because consistency is tied to daily check-ins in MVP:
- `consistencyDaysCount = reflectionDaysCount`

This should still be stored explicitly in summary documents for clarity and future migration flexibility.

## 3.5 Domain Score Computation

### Standard case

If reflection exists:

```text
CurrentComputedScore = 0.3R + 0.4A + 0.3C
```

### Missing-reflection case

If `R = null`:

```text
CurrentComputedScore = (0.4A + 0.3C) / 0.7
```

Also set:
- `usedReflectionReweighting = true`

Otherwise:
- `usedReflectionReweighting = false`

### Output clamping

Clamp domain outputs to `0..100` even if rounding or edge conditions would otherwise exceed the range.

## 3.6 Onboarding Blend Computation

During the 14-day onboarding period, blend the domain score with the user's onboarding baseline.

Bootstrap schedule:

```text
Days 1-3    : 0.7 initial + 0.3 observed
Days 4-7    : 0.4 initial + 0.6 observed
Days 8-14   : 0.2 initial + 0.8 observed
Day 15 onward : 0.0 initial + 1.0 observed
```

Recommended implementation rule:
- determine the user's onboarding age when the scoring window is evaluated
- use the matching bootstrap weight for that week

Formula:

```text
BlendedComputedScore =
  BootstrapWeight * InitialRatingScore
  + ObservedWeight * CurrentComputedScore
```

If onboarding has expired:
- `BootstrapWeight = 0`
- `ObservedWeight = 1`
- `BlendedComputedScore = CurrentComputedScore`

## 3.7 Displayed Score Smoothing

The displayed score is a presentation layer, not the truth.

### First scored week

```text
DisplayedScore_1 = BlendedComputedScore_1
```

### Later weeks

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * BlendedComputedScore_t
```

Rules:
- use the previous week's displayed score for the same domain
- clamp to `0..100`

Why blended score is used here:
- during onboarding, the displayed score should reflect the temporary bootstrap logic
- after onboarding, blended and observed scores are the same

## 3.8 Life-Level Aggregation

Once all five domain summaries are computed for a week:

### Life Strength

```text
LifeStrength = (D1 + D2 + D3 + D4 + D5) / 5
```

### Evenness

```text
Evenness = clamp(100 - 2 * SD(D1, D2, D3, D4, D5), 0, 100)
```

### Final weekly score

```text
BalancedLifeScore = 0.5 * LifeStrength + 0.5 * Evenness
```

Store:
- `strongestDomainKey`
- `weakestDomainKey`

These help the app provide immediate weekly insights without recomputing comparisons client-side.

## 3.9 Recommended Background Jobs

### Job A: feature-write normalization triggers

Type:
- Firestore triggers

Purpose:
- convert feature collection writes into score-eligible `actionEvents`

Examples:
- `journalEntries.onCreate`
- `expenseLogs.onCreate`
- `sleepLogs.onCreate`
- `focusSessions.onWrite`
- `tasks.onUpdate` when status changes to completed

Responsibilities:
- validate payload
- derive scoring timezone fields
- enforce anti-gaming rules
- compute `dedupeKey`
- create or reject normalized action event

Important design rule:
- trigger logic should delegate formula and validation behavior to shared helper functions, not duplicate logic inline

### Job B: weekly score finalizer

Name:
- `finalizeWeeklyScores`

Type:
- scheduled Cloud Function

Recommended cadence:
- run every hour

Why hourly:
- users are spread across timezones
- weekly boundaries occur at different UTC times
- hourly cadence is simple and sufficient for MVP

Responsibilities:
- identify users whose prior local scoring week has closed and is not yet finalized
- compute five domain summaries
- compute one life summary
- persist summary documents with deterministic ids
- mark them finalized

Important implementation rule:
- the function must be idempotent
- rerunning the job for the same user and week must produce the same summary documents without duplication

### Job C: optional streak refresher

Name:
- `refreshCurrentStreak`

Type:
- event-driven or scheduled helper

Purpose:
- update `currentStreakDays` in the user profile

This is useful but not required for the scoring engine itself.

### Job D: admin repair job

Name:
- `rebuildWeeklyScores`

Type:
- admin-only callable function or secure internal endpoint

Purpose:
- repair historical summaries
- rerun score generation after bug fixes or rule migrations

This job must not be exposed to normal users.

## 3.10 Provisional Current-Week Preview

VELORA wants daily internal calculation but weekly official presentation.

For MVP, the cleanest approach is:
- official weekly scores are persisted by the backend
- provisional current-week progress is calculated on demand using the shared scoring module

Recommended preview strategy:
- the app reads:
  - current-week `dailyCheckins`
  - current-week `actionEvents`
  - `domainBaselines`
  - latest finalized `weeklyDomainSummaries`
- the app computes a provisional current-week preview locally using the shared score module

Why this is a good MVP tradeoff:
- avoids extra write-heavy preview collections
- keeps the official score backend-authoritative
- still supports responsive progress UI

Important UX rule:
- current-week preview should be clearly presented as provisional
- history and official weekly results should come only from finalized summary documents

## 3.11 Finalization and Backfill Rules

Official weekly summaries should be treated as locked after finalization.

Rules:
- late user edits do not silently rewrite finalized weeks
- backfilled events for past weeks are allowed to exist as source data if the product allows it
- historical summary recalculation should happen only through `rebuildWeeklyScores` or equivalent admin repair logic

This protects trust and makes weekly reports stable.

## 3.12 Failure Handling and Auditability

Every score-related server workflow should preserve enough metadata to explain what happened.

Recommended logging and audit behavior:
- keep `validationStatus`, `wasDuplicate`, `wasCapped`, and `rejectionReason` on `actionEvents`
- keep `usedReflectionReweighting`, `bootstrapWeightUsed`, and `isProvisional` on weekly summaries
- use deterministic ids for summary documents and high-value normalized events

If a job fails:
- it should be safe to rerun
- no duplicate weekly summaries should be created
- no duplicate accepted score events should be created for the same source record

## 3.13 Step 3 Recommendation Summary

The recommended computation model for MVP is:

- shared scoring module for formulas
- callable function for daily check-ins
- trigger-based normalization into `actionEvents`
- hourly scheduled weekly finalization
- official weekly summaries persisted in Firestore
- provisional current-week preview computed on demand
- admin-only rebuild path for repairs

This is the best balance of correctness, Firebase simplicity, and future extensibility for VELORA.

## Step 4: Cross-Platform Mobile Module Map

### 4.1 Locked mobile stack

The mobile app stack is locked as:
- `React Native`
- `Expo`
- `TypeScript`

### Why this stack is locked

This stack is the best MVP fit for VELORA because it provides:
- fast cross-platform delivery for iOS and Android
- strong Firebase integration
- good developer velocity for a feature-rich MVP
- clean support for notifications, charts, offline-tolerant flows, and future AI-driven features

### Recommended supporting choices

To align the mobile codebase with the backend blueprint, the recommended supporting choices are:
- `Expo Router` for navigation
- Firebase client SDKs for auth and Firestore access
- shared TypeScript domain and scoring utilities

Further Step 4 decisions will build on this stack.

### 4.2 Locked MVP feature set

The MVP is locked as a focused scoring-centered product.

Included in MVP:
- authentication
- onboarding baseline quiz
- daily check-ins
- dashboard with overall balance score and five domain scores
- journal entries
- meaningful connection logs
- tasks and focus sessions
- activity logs
- sleep logs
- expense logs
- budget or savings action logs
- weekly missions or prompts
- weekly summaries and simple history
- streak
- profile and settings

Explicitly deferred from MVP:
- social feature with friends
- photo or hobby gallery
- diet and calorie tracking
- advanced recommendation engine
- AI features
- wearable integrations
- shared goals or community features
- advanced financial analytics

### MVP scope note

The purpose of the MVP is to prove the core promise of VELORA:
- users can reflect across the five domains
- users can log enough meaningful behavior to generate domain scores
- users can understand their balance through weekly summaries and domain breakdowns

Anything that does not directly strengthen that loop is intentionally deferred.

### 4.3 Product roadmap split

The following features are intentionally planned for post-MVP releases:
- social and community features
- photo support
- calorie tracking
- AI features
- advanced recommendations
- wearable integrations

These should influence extensibility decisions, but they must not expand the Version 1 implementation scope.

### 4.4 Locked offline posture

The mobile app is locked as `offline-tolerant`, not fully offline-first.

This means:
- the app should remain usable during temporary network issues
- previously loaded data may be shown from cache
- user-owned content writes may queue locally and sync when connectivity returns
- the app may show pending sync state where appropriate

This does not mean:
- official weekly summaries are computed offline
- score truth is owned by the device
- complex offline conflict resolution is required for MVP

### Offline-tolerant design implications

For Version 1:
- official scores remain backend-authoritative
- summary collections remain server-derived
- user-entered content can rely on Firebase local persistence and queued sync behavior
- the UI should distinguish between provisional local state and finalized server state when needed

### 4.5 Final mobile module map

This section defines how the React Native + Expo + TypeScript app should be structured for the VELORA MVP.

## 4.5.1 Mobile architecture goals

The app architecture should optimize for:
- simple navigation
- clear ownership of scoring-critical flows
- modular domain features
- easy Firebase integration
- low-friction future expansion into post-MVP features

### Recommended client-side architectural layers

1. app shell and navigation
- routes
- tabs
- auth gating

2. feature modules
- onboarding
- dashboard
- check-ins
- journaling
- tasks and focus
- health logging
- finance logging
- missions
- weekly summaries
- settings

3. domain and scoring layer
- TypeScript domain models
- score preview utilities
- date and timezone utilities

4. data access layer
- Firebase Auth integration
- Firestore read and write wrappers
- Cloud Function clients

5. shared UI layer
- charts
- cards
- buttons
- form controls
- domain badges
- loading and empty states

## 4.5.2 Navigation structure

Recommended navigation:
- auth stack for sign-in and sign-up
- onboarding stack for first-time users
- main tab navigation for everyday use
- detail screens pushed from tabs

### Recommended main tabs

1. `Home`
- dashboard
- current balance overview
- weekly highlights
- quick actions

2. `Check-In`
- daily domain check-ins
- fast entry flow

3. `Actions`
- journal
- connection log
- tasks
- focus sessions
- activity logs
- sleep logs
- expense logs
- budget or savings actions

4. `Summary`
- weekly summaries
- domain breakdowns
- history

5. `Settings`
- profile
- timezone display
- future notification settings

### Navigation note

The `Actions` tab can be implemented as either:
- a hub screen linking to action modules
- or a nested stack with grouped action tools

For MVP, a simple action hub screen is preferred.

## 4.5.3 Screen map

### Auth module

Screens:
- sign in
- sign up

Responsibilities:
- Firebase Auth flows
- route users into onboarding or main app

Reads:
- auth state only

Writes:
- Firebase Auth credentials

### Onboarding module

Screens:
- welcome and value framing
- display name and timezone
- five-domain baseline quiz

Responsibilities:
- collect initial setup
- submit `completeOnboarding`

Reads:
- auth user

Writes:
- callable Cloud Function `completeOnboarding`

### Home module

Screens:
- main dashboard

Responsibilities:
- show latest official balance score
- show five displayed domain scores
- show strongest and weakest domains
- show streak
- surface quick actions for check-in and logging

Reads:
- latest `weeklyLifeSummaries`
- latest `weeklyDomainSummaries`
- `users/{userId}`

Writes:
- none directly

### Check-In module

Screens:
- daily check-in form
- confirmation or completion state

Responsibilities:
- collect one daily reflection per domain
- show completion state for today
- optionally show provisional impact hints

Reads:
- current day's `dailyCheckins`
- optional current-week provisional score preview inputs

Writes:
- callable Cloud Function `submitDailyCheckin`

### Action hub module

Screens:
- action hub

Responsibilities:
- route users to the correct action tool by domain or need

Reads:
- none required beyond static module definitions

Writes:
- none

### Spirituality module

Screens:
- journal list
- journal create and edit

Responsibilities:
- create journal entries
- review prior entries

Reads:
- `journalEntries`

Writes:
- `journalEntries`

Scoring link:
- Firestore trigger may emit `journal_entry` action event

### Family and Friends module

Screens:
- connection log list
- add connection log

Responsibilities:
- record meaningful connection actions

Reads:
- `connectionLogs`

Writes:
- `connectionLogs`

Scoring link:
- trigger may emit `meaningful_connection_log`

### Work/Productivity module

Screens:
- task list
- task create and update
- focus timer or focus session logger

Responsibilities:
- manage simple productivity actions
- support both task completion and focus logging

Reads:
- `tasks`
- `focusSessions`

Writes:
- `tasks`
- `focusSessions`

Scoring link:
- task completion trigger may emit `important_task_completed`
- focus session completion trigger may emit `focus_session`

### Health module

Screens:
- activity log list and create
- sleep log list and create

Responsibilities:
- record exercise or movement
- record sleep

Reads:
- `activityLogs`
- `sleepLogs`

Writes:
- `activityLogs`
- `sleepLogs`

Scoring link:
- triggers may emit `exercise_log` and `sleep_log`

### Financial Wellbeing module

Screens:
- expense log list and create
- budget or savings action list and create

Responsibilities:
- record financial tracking and deliberate finance actions

Reads:
- `expenseLogs`
- `financialActions`

Writes:
- `expenseLogs`
- `financialActions`

Scoring link:
- triggers may emit `expense_log` and `budget_review_or_savings_action`

### Missions module

Screens:
- mission list
- mission detail

Responsibilities:
- show assigned missions
- let the user complete or progress them

Reads:
- `missions`
- `userMissions`

Writes:
- `userMissions`

Scoring link:
- mission completion trigger may emit the relevant action event based on mission design

### Summary module

Screens:
- weekly summary list
- weekly summary detail
- domain history detail

Responsibilities:
- show official weekly score history
- explain domain changes over time
- present balance visual and weekly insights

Reads:
- `weeklyLifeSummaries`
- `weeklyDomainSummaries`

Writes:
- none directly

### Settings module

Screens:
- profile
- app settings

Responsibilities:
- show profile info
- allow safe non-scoring settings edits
- later host notification preferences

Reads:
- `users/{userId}`

Writes:
- limited updates to allowed profile fields

## 4.5.4 Client data flow

### Read model

The app should prefer reading already-derived summary documents where possible.

Examples:
- Home reads weekly summaries, not raw score inputs
- Summary screens read weekly summaries, not raw calculation state
- current-day check-in screen reads current day's `dailyCheckins`

This reduces client complexity and keeps official score presentation aligned with backend truth.

### Write model

There are two write patterns:

1. callable function writes
- onboarding
- daily check-in

2. direct Firestore writes
- user-owned feature content such as journals, logs, tasks, and missions

Scoring-critical derived data should always come back through backend-owned collections.

### Provisional preview model

If the dashboard or check-in screen shows current-week progress before official finalization:
- compute it from local reads plus shared score utilities
- label it clearly as provisional
- never overwrite official summary documents from the client

## 4.5.5 Offline-tolerant UX behavior

### Allowed offline-friendly behavior

- cached summaries may remain visible
- content entry forms may queue writes
- current-day check-in may queue until connection returns
- action logging may queue until connection returns

### Required UX signals

The UI should show when relevant:
- pending sync
- failed sync
- last official weekly summary date
- provisional versus official score state

### What not to promise in MVP

- instant official score updates while offline
- full offline weekly summary generation
- conflict-free offline collaboration or multi-device merge guarantees beyond Firebase defaults

## 4.5.6 Recommended code organization

Recommended top-level mobile app structure:

```text
src/
  app/
    (auth)/
    (onboarding)/
    (tabs)/
  features/
    auth/
    onboarding/
    home/
    checkin/
    spirituality/
    family-friends/
    work/
    health/
    finance/
    missions/
    summary/
    settings/
  components/
    ui/
    charts/
    forms/
    feedback/
  lib/
    firebase/
    functions/
    firestore/
    auth/
  domain/
    models/
    scoring/
    dates/
    constants/
  hooks/
  store/
  types/
```

### Folder responsibilities

`app/`
- route definitions and layout structure using Expo Router

`features/`
- screen-specific logic, forms, and module UI

`components/`
- reusable presentation components

`lib/firebase/`
- Firebase app initialization

`lib/functions/`
- callable Cloud Function clients

`lib/firestore/`
- typed query and write helpers

`domain/scoring/`
- pure score utilities shared with backend logic where possible

`domain/dates/`
- timezone and week-boundary helpers

## 4.5.7 State management recommendation

Use lightweight state management.

Recommended split:
- local component state for forms and transient UI
- Firebase auth listener for session state
- Firestore subscriptions only where realtime meaningfully improves UX
- cached query hooks or repository wrappers for summaries and logs

Avoid introducing a heavy global state system unless the codebase actually grows to need it.

## 4.5.8 Realtime usage recommendation

Use realtime listeners selectively:

Good realtime candidates:
- auth session state
- current day's check-ins
- latest weekly summaries on the dashboard

Better as fetch-on-focus or query-based reads:
- long history lists
- journal archives
- older logs

This keeps Firebase usage efficient and the app simpler.

## 4.5.9 Module-to-backend mapping summary

| Mobile module | Primary backend contract |
| --- | --- |
| Auth | Firebase Auth |
| Onboarding | `completeOnboarding` callable function |
| Daily Check-In | `submitDailyCheckin` callable function |
| Journal | `journalEntries` collection |
| Connection Log | `connectionLogs` collection |
| Tasks | `tasks` collection |
| Focus | `focusSessions` collection |
| Activity | `activityLogs` collection |
| Sleep | `sleepLogs` collection |
| Expense | `expenseLogs` collection |
| Budget or Savings | `financialActions` collection |
| Missions | `missions` + `userMissions` |
| Home dashboard | `weeklyLifeSummaries` + `weeklyDomainSummaries` |
| History and summary | `weeklyLifeSummaries` + `weeklyDomainSummaries` |
| Settings | `users/{userId}` |

## 4.5.10 Final Step 4 recommendation summary

The VELORA mobile app should be structured as:
- a React Native + Expo + TypeScript app
- Firebase-backed and backend-authoritative for score truth
- organized around a small number of focused feature modules
- optimized for offline-tolerant content capture
- driven by weekly summary documents for official score presentation

This gives Version 1 a clear, buildable shape while keeping the codebase extensible for future AI, social, media, recommendation, and wearable features.

## Step 5: Implementation Sequencing, Task Breakdown, and Repository Setup

### 5.1 Sequencing principles

The V1 build should follow these principles:

1. build the core balance loop first
- onboarding
- daily check-in
- action capture
- weekly score generation
- dashboard and summary display

2. make backend score truth real before polishing UI depth
- it is better to have fewer screens with correct score behavior than many screens with unstable score logic

3. build in vertical slices
- each phase should produce something demoable, not just infrastructure

4. keep post-MVP features out of the implementation path
- social
- AI
- photos
- calorie tracking
- wearables
- advanced recommendations

### 5.2 Recommended repository setup for this repo

Current repo context:
- `/Documentation` contains the real product and scoring decisions
- `/pulse` is a Create React App scaffold and should not be used as the main V1 mobile app foundation

Recommended V1 repository layout:

```text
/Documentation
/mobile
/functions
/shared
/firebase.json
/firestore.rules
/firestore.indexes.json
/storage.rules
```

Recommended roles:

`/mobile`
- Expo React Native app
- screens
- feature modules
- Firebase client integration

`/functions`
- Cloud Functions for Firebase
- callable functions
- Firestore triggers
- scheduled weekly jobs

`/shared`
- pure TypeScript shared code
- domain constants
- score formulas
- date and timezone utilities
- validation helpers

### Repository guidance for `pulse/`

For Version 1:
- do not build the mobile app inside `/pulse`
- keep `/pulse` as legacy or ignore it during the mobile build unless you later decide to create a web companion

This avoids mixing a CRA web scaffold with the mobile-first Expo app architecture.

## 5.3 Recommended phase order

### Phase 0: Repository and toolchain setup

Goal:
- establish the workspace shape before feature work starts

Tasks:
- create `/mobile` Expo + TypeScript app
- create `/functions` Firebase functions project with TypeScript
- create `/shared` package or shared folder for score and domain utilities
- add Firebase project config files
- add formatting, linting, and test scripts
- configure local emulators for Auth, Firestore, and Functions if using them

Exit criteria:
- mobile app boots locally
- functions build successfully
- shared utilities can be imported from both mobile and functions

### Phase 1: Firebase foundation

Goal:
- create the minimum backend backbone

Tasks:
- initialize Firebase Auth
- create `users/{userId}` creation flow
- add base Firestore Security Rules
- define top-level collections:
  - `domains`
  - `actionRules`
  - `missions`
  - `users`
- add Firestore indexes required by the blueprint
- seed the fixed domain documents

Exit criteria:
- sign-up creates a user profile document
- secure reads and writes work for one authenticated user
- unauthorized access is blocked

### Phase 2: Shared domain and scoring foundation

Goal:
- make the scoring model executable and testable before deep UI work

Tasks:
- define domain keys and action type constants
- implement rating mapping `1 -> 20` through `5 -> 100`
- implement week-boundary and timezone utilities
- implement domain score formulas
- implement onboarding decay formulas
- implement life strength and evenness formulas
- add unit tests for score formulas and edge cases

Exit criteria:
- shared score utilities produce deterministic outputs
- agreed examples from the documentation can be reproduced in tests

### Phase 3: Auth and onboarding vertical slice

Goal:
- get a new user from sign-up to a completed baseline profile

Tasks:
- build sign-up and sign-in screens
- build onboarding screens
- implement `completeOnboarding`
- write `domainBaselines`
- persist `scoringTimezone`
- gate the main app until onboarding is complete

Exit criteria:
- a new user can create an account, complete onboarding, and land in the app shell

### Phase 4: Daily check-in and basic dashboard vertical slice

Goal:
- deliver the first real scoring loop input

Tasks:
- build daily check-in screen
- implement `submitDailyCheckin`
- store one check-in per domain per day
- build a basic home dashboard shell
- show latest official summary if present
- show current-day completion state

Exit criteria:
- a user can complete daily check-ins
- check-ins are stored correctly with local day resolution
- the app can display baseline profile state and check-in completion state

### Phase 5: Action pipeline foundation

Goal:
- make non-check-in actions flow into score-relevant normalized events

Tasks:
- create `actionRules`
- implement trigger helpers for:
  - validation
  - `dedupeKey` generation
  - daily cap logic
  - accepted versus rejected event creation
- implement `actionEvents` creation flow
- add audit metadata

Recommended first action types:
- `journal_entry`
- `important_task_completed`
- `focus_session`
- `exercise_log`
- `sleep_log`
- `expense_log`

Exit criteria:
- a valid feature write can create an accepted `actionEvents` record
- duplicate or invalid inputs do not inflate score inputs

### Phase 6: Core action feature modules

Goal:
- ship the minimum domain action tools needed for `A`

Tasks:
- journaling module
- meaningful connection logs
- tasks
- focus sessions
- activity logs
- sleep logs
- expense logs
- budget or savings action logs

Recommended order inside this phase:
1. journaling
2. tasks and focus sessions
3. activity and sleep
4. expense and finance actions
5. connection logs

Why this order:
- it prioritizes reusable action patterns and the domains with the clearest scoring behavior

Exit criteria:
- each of the five domains has at least one working action path that feeds `actionEvents`

### Phase 7: Weekly summary generation

Goal:
- make the score official and visible

Tasks:
- implement `finalizeWeeklyScores`
- compute `weeklyDomainSummaries`
- compute `weeklyLifeSummaries`
- persist strongest and weakest domain metadata
- implement first partial-week handling
- implement displayed score smoothing

Exit criteria:
- the backend can generate official weekly summaries for a test user
- summary documents are idempotent and stable

### Phase 8: Summary, history, and dashboard polish

Goal:
- turn official score data into the core VELORA experience

Tasks:
- complete dashboard UI
- add balance visual or radar chart
- add weekly summary list and detail screens
- add simple history views
- add strongest and weakest domain messaging
- distinguish official versus provisional state in the UI

Exit criteria:
- users can understand their current balance and recent weekly history without reading raw logs

### Phase 9: Missions and streak

Goal:
- add motivation and guidance loops

Tasks:
- seed mission data
- build missions screens
- implement mission completion updates
- build streak tracking and display

Exit criteria:
- users can receive and complete missions
- streak value is visible and behaves correctly

### Phase 10: Hardening and release readiness

Goal:
- prepare V1 for real usage

Tasks:
- tighten Security Rules
- verify offline-tolerant behavior
- add loading, empty, and sync-pending states
- test summary generation across timezones
- test first-week partial logic
- review privacy boundaries for logs and analytics
- add crash reporting and lightweight monitoring if desired

Exit criteria:
- core flows are stable
- score outputs are trusted
- app is ready for controlled release

## 5.4 Recommended work breakdown by track

These tracks can overlap once the foundations are in place.

### Track A: mobile shell
- Expo app setup
- navigation
- auth gating
- base UI system

### Track B: backend platform
- Firebase project setup
- Security Rules
- callable functions
- Firestore triggers
- scheduled jobs

### Track C: shared score domain
- formulas
- constants
- validation
- date utilities
- tests

### Track D: feature modules
- check-ins
- journaling
- work tools
- health logging
- finance logging
- missions
- summaries

If the team is small, Tracks A to C should come first, then Track D.

## 5.5 Recommended first release milestone

The first milestone worth calling an internal V1 alpha is:

- sign up and onboarding work
- daily check-ins work
- at least one valid action path exists in each domain
- one official weekly summary can be generated and displayed
- dashboard shows balance and domain scores

This should be treated as the first truly integrated milestone.

## 5.6 Features that should not block V1

These should stay out of the critical path:
- social graph or friend feeds
- image uploads
- AI coaching
- recommendation engine
- calorie tracking
- wearable sync

Do not let the codebase structure or sprint plan drift toward them before the score-centered loop is complete.

## 5.7 Implementation risk checklist

Highest-risk areas to verify early:
- timezone correctness
- first partial-week behavior
- check-in uniqueness by local day
- action deduplication
- scheduled weekly summary idempotency
- alignment between shared preview logic and backend final logic

These risks should be tested before investing heavily in UI polish.

## 5.8 Final Step 5 recommendation summary

The safest build order for VELORA V1 is:
- establish repo and Firebase foundations
- make the score model executable
- ship onboarding and check-ins
- build action normalization
- add core action modules
- generate official weekly summaries
- polish dashboard and history
- then add motivation features like missions and streak

That sequence keeps the hardest system problems near the front and reduces the risk of building a polished shell on top of unstable score logic.
