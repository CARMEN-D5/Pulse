# VELORA Scoring Architecture Decisions

Last updated: 2026-04-02

This document records scoring-model decisions agreed during architecture review so they can be reused in future design, implementation, and report updates.

Reference source:
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/Balanced Life.docx`

## Status

Resolved critical gaps:
- Gap 1: authoritative score vs smoothing model
- Gap 2: reflection window and missing reflection handling
- Gap 3: weekly window boundaries and timezone behavior
- Gap 4: anti-gaming rules
- Gap 5: onboarding self-rating decay and expiry
- Gap 6: precise definition of meaningful activity day per domain
- Gap 7: privacy, sensitive-data handling, and analytics boundaries

Open critical gaps:
- none currently locked as critical scoring blockers

## Gap 1: Authoritative Score vs Displayed Score

### Decision

The weekly computed domain score is the source of truth.

The displayed domain score is a smoothed presentation value and must not replace the authoritative computed score.

### Authoritative formula

```text
CurrentComputedScore = 0.3R + 0.4A + 0.3C
```

Where:
- `R` = reflection score
- `A` = action score
- `C` = consistency score

### Display smoothing formula

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * CurrentComputedScore_t
```

Rules:
- clamp displayed score to `0..100`
- for the first scored week:

```text
DisplayedScore_1 = CurrentComputedScore_1
```

### Architectural note

Store both values separately:
- `computed_score`
- `displayed_score`

This keeps the system auditable and allows smoothing logic to change later without redesigning the core scoring engine.

## Gap 2: Reflection Window and Missing Reflection Handling

### Decision

Reflection is calculated only from daily check-ins.

Rules:
- at most one reflection per domain per day
- reflection values use a `1..5` input scale
- map reflection values to `20..100`:

```text
1 -> 20
2 -> 40
3 -> 60
4 -> 80
5 -> 100
```

- missing days are ignored in the reflection average
- reflection is not a consistency measure and must not be counted as `0` when absent

### Reflection formula

```text
R_d,w = average of all recorded daily reflection values for domain d within the weekly window
```

Example:

```text
R_health = (80 + 60 + 80 + 40 + 100 + 80 + 80) / 7 = 74.3
```

### Missing reflection rule

If no reflection exists in the weekly window for a domain:
- `R = null`
- do not substitute `0`
- compute domain score by proportionally reweighting the remaining available components

### Domain formula with reflection present

```text
DomainScore = 0.3R + 0.4A + 0.3C
```

### Domain formula when reflection is missing

```text
DomainScore = (0.4A + 0.3C) / 0.7
```

### Architectural note

Missing reflection is treated as missing data, not negative wellbeing.

For auditability, weekly summaries should also track:
- `reflection_days_count`
- whether proportional reweighting was used

## Gap 3: Weekly Window Boundaries and Timezone Behavior

### Decision

VELORA uses real calendar days, not rolling 24-hour buckets.

All scoring is based on a fixed user scoring timezone stored on the user profile.

### Time boundaries

Scoring day:
- local calendar day from `00:00:00` to `23:59:59` in the user's scoring timezone

Scoring week:
- Monday `00:00:00` to Sunday `23:59:59` in the user's scoring timezone

### Event storage rule

All event timestamps are stored in UTC.

Before assigning an event to a day or week, the backend converts the UTC timestamp into the user's scoring timezone.

### Event assignment rule

An event belongs to the day and week it falls into after conversion to the user's scoring timezone.

### Fixed timezone rule

For MVP, the user has one fixed scoring timezone.

The scoring engine should not silently follow device timezone changes during travel.

### First-week rule

If a user starts mid-week, the first scoring window is partial:
- starts on the local signup day
- ends at the end of that scoring week on Sunday

This first weekly score is marked as provisional.

### Partial-week scoring rules

For the first partial week:
- reflection averages only actual recorded check-ins
- action targets are prorated by active days
- consistency uses active days as the denominator instead of `7`

Definitions:

```text
ActiveDays = number of local calendar days from signup date to end of first scoring week

ProratedActionTarget = NormalWeeklyTarget * (ActiveDays / 7)

Consistency = (DaysWithMeaningfulActivity / ActiveDays) * 100
```

### Example

If a user signs up on Wednesday:
- first scoring week = Wednesday to Sunday
- `ActiveDays = 5`
- a domain with weekly target `300` becomes:

```text
ProratedActionTarget = 300 * (5 / 7) = 214.3
```

### Display smoothing interaction

The provisional first week still uses the same smoothing rule:
- first available week:

```text
DisplayedScore_1 = CurrentComputedScore_1
```

- later weeks:

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * CurrentComputedScore_t
```

## Recommended Data Fields

User profile:
- `scoring_timezone`

Events:
- `occurred_at_utc`

Weekly summary:
- `week_start_local_date`
- `week_end_local_date`
- `active_days_in_window`
- `is_provisional`
- `reflection_days_count`
- `computed_score`
- `displayed_score`

Optional denormalized fields:
- `local_event_date`
- `local_week_start_date`

## Implementation Guidance

- Keep score calculation authoritative on the backend.
- Use the mobile app for event capture and provisional progress display only.
- Preserve enough metadata to explain how each weekly score was produced.
- Treat smoothing as a presentation rule, not as truth.

## Next Decision Areas

Next recommended topic:
- implementation blueprint, schema design, and API contracts

## Gap 4: Anti-Gaming Rules

### Decision

VELORA should reward meaningful behavior, not raw event volume.

The scoring system must therefore validate actions on the backend, apply per-action caps, ignore obvious duplicates, and ensure that consistency is based on active days rather than event count.

### Core anti-gaming rules

1. Server-authoritative scoring
- the mobile client submits events only
- the backend decides whether an event is valid and how many points it earns
- the client must not submit final points or final scores as authoritative values

2. Weekly action score cap
- the normalized weekly action score for a domain is capped at `100`
- users may log more activity than the target, but extra activity does not increase the action score beyond `100`

3. Consistency counts days, not event volume
- consistency credit is awarded once per domain per day
- multiple valid events in the same domain on the same day still count as only one meaningful activity day

4. Naturally unique actions are limited to one scored event per day
- daily check-in: max `1` per domain per day
- sleep log: max `1` per day
- budget review: max `1` per day

5. Repeatable actions have scored daily caps
- events above the cap may still be stored
- events above the cap receive `0` additional score

6. Obvious duplicates must be ignored or rejected
- duplicate submissions must not generate additional score

7. Empty shell events must not earn points
- events must satisfy minimum payload requirements before scoring

8. Weekly summaries are locked after finalization
- backfilled events after finalization should not silently alter closed weekly scores
- recalculation should happen only through controlled system or admin processes if allowed later

### MVP scored daily caps by action type

These caps are intentionally simple and conservative for the MVP.

Spirituality:
- journal entry: max `1` scored entry per day
- mindfulness or prayer session: max `2` scored sessions per day

Family and Friends:
- meaningful connection log: max `2` scored logs per day
- social mission or relationship task: max `1` scored completion per day

Work/Productivity:
- important task completed: max `5` scored tasks per day
- focus session completed: max `4` scored sessions per day

Health:
- exercise or activity log: max `2` scored logs per day
- sleep log: max `1` scored log per day

Financial Wellbeing:
- expense log: max `5` scored entries per day
- budget review or savings action: max `1` scored action per day

### Action validation requirements

An event must satisfy its minimum payload requirements before it can earn points.

Recommended MVP validation rules:

- daily check-in
  - requires a valid `1..5` rating

- journal entry
  - requires non-empty text content
  - optional future enhancement: minimum character threshold

- mindfulness or prayer session
  - requires a valid session record
  - optional future enhancement: minimum duration threshold

- meaningful connection log
  - requires a connection type, contact label, or short note

- social mission or relationship task
  - requires completion of a real mission or task record

- important task completed
  - requires a real task identifier or task title

- focus session
  - requires a valid completed session record
  - optional future enhancement: minimum session duration

- exercise or activity log
  - requires an activity type
  - optional future enhancement: minimum duration or distance

- sleep log
  - requires a sleep entry for the relevant day

- expense log
  - requires amount and category

- budget review or savings action
  - requires a valid review or savings event record

### Duplicate detection guidance

The backend should reject or ignore events that are obviously duplicates.

Recommended duplicate checks:
- same `user_id`
- same `domain`
- same `action_type`
- same local scoring day
- same reference object or near-identical payload
- same event created repeatedly within a short time window

Recommended implementation detail:
- generate or derive a `dedupe_key` for events that should be unique
- example basis: `user_id + domain + action_type + local_date + reference_id`

### Event scoring behavior

For each submitted event:

1. Validate the payload.
2. Convert `occurred_at_utc` into the user's scoring timezone.
3. Determine the local scoring day and scoring week.
4. Check duplicate rules.
5. Check scored daily cap for the action type.
6. If valid and within cap, award base points.
7. If valid but above cap, store the event and award `0` extra points.
8. If invalid or duplicate, store rejection metadata if desired and award `0` points.

### Recommended action rules configuration

Rather than hardcoding all action behavior into mobile screens, the backend should maintain an action-rules configuration with fields such as:

- `action_type`
- `domain`
- `base_points`
- `max_scored_per_day`
- `max_scored_per_week` if needed later
- `counts_for_consistency`
- `requires_unique_reference`
- `requires_nonempty_content`
- `is_enabled`

This keeps the scoring engine stable while allowing future tuning without redesigning the application.

### Audit fields

For explainability and debugging, scored events or score summaries should preserve:

- `awarded_points`
- `was_capped`
- `was_duplicate`
- `validation_status`
- `rejection_reason`
- `counts_for_consistency`

### Architectural note

The anti-gaming layer should remain simple in MVP:
- validation
- duplicate control
- daily caps
- weekly action cap
- consistency-by-day

More advanced trust or fraud systems are unnecessary at this stage.

## Gap 5: Onboarding Self-Rating Decay and Expiry

### Decision

Onboarding self-ratings are a temporary bootstrap signal only.

They exist to provide an initial profile before enough real evidence has been collected. They must gradually decay and then expire completely so that long-term scores are based only on observed user behavior.

### Purpose of the onboarding baseline

The onboarding baseline helps:
- avoid empty first-week scores
- show value immediately after signup
- give the user an initial personalized domain profile

The onboarding baseline must not remain a permanent hidden influence on the score.

### Final decay schedule

The initial self-rating influence decays by account age as follows:

```text
Days 1-3    : 0.7 initial + 0.3 observed
Days 4-7    : 0.4 initial + 0.6 observed
Days 8-14   : 0.2 initial + 0.8 observed
Day 15 onward : 0.0 initial + 1.0 observed
```

This means the onboarding baseline fully expires after 14 days.

### Domain-level blending rule

The onboarding baseline blends with the computed domain score, not with each sub-component separately.

```text
BlendedComputedScore_d,t =
  BootstrapWeight_t * InitialRatingScore_d
  + ObservedWeight_t * CurrentComputedScore_d,t
```

Where:
- `InitialRatingScore_d` is the onboarding domain score mapped from `1..5` to `20..100`
- `CurrentComputedScore_d,t` is the computed score from reflection, action, and consistency for domain `d` at time `t`

### Mapping rule for initial self-ratings

```text
1 -> 20
2 -> 40
3 -> 60
4 -> 80
5 -> 100
```

### Interaction with displayed score smoothing

During the onboarding period:

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * BlendedComputedScore_t
```

For the first available week:

```text
DisplayedScore_1 = BlendedComputedScore_1
```

After onboarding expiry:

```text
DisplayedScore_t = 0.7 * PreviousDisplayedScore + 0.3 * CurrentComputedScore_t
```

### Architectural note

This keeps the scoring pipeline clean:
- event capture
- weekly computed score from observed evidence
- temporary onboarding blend
- displayed score smoothing

### Recommended stored fields

For auditability and debugging, store:
- `initial_rating_score`
- `bootstrap_weight_used`
- `observed_weight_used`
- `blended_computed_score`

### Implementation note

For MVP, decay is based on account age rather than evidence sufficiency.

Future enhancement:
- decay faster once a domain has accumulated enough real evidence

This enhancement is not required for MVP.

## Gap 6: Meaningful Activity Day Definition

### Decision

For MVP, a meaningful activity day is defined only by the domain daily check-in.

This is an intentional simplification to keep the scoring model easier to explain and implement.

### Rule

A domain receives `1` meaningful activity day on a local scoring day if the user completes the daily check-in for that domain on that day.

If the user does not complete the daily check-in for that domain on that day, the domain receives `0` meaningful activity credit for that day.

### Scope

For MVP:
- daily check-in is sufficient to create consistency credit
- action events do not define meaningful activity days
- multiple actions on the same day do not affect consistency

### Consistency formula

For a standard full week:

```text
C_d = (DaysWithDailyCheckIn_d / 7) * 100
```

For a first partial week:

```text
C_d = (DaysWithDailyCheckIn_d / ActiveDays) * 100
```

### Architectural note

This keeps consistency simple and deterministic, but it also makes reflection and consistency more closely related than in a more behavior-based design.

This tradeoff is acceptable for MVP and can be revised later if the product needs stronger separation between self-reporting and action maintenance.

## Gap 7: Privacy, Sensitive-Data Handling, and Analytics Boundaries

### Decision

VELORA must collect only the minimum data required for the MVP, keep sensitive raw content separate from scoring inputs, and exclude private free-text content from product analytics.

For MVP, raw personal text must not be used as a scoring input.

### Core privacy principles

1. Data minimization
- collect only the data required for product features, scoring, and user-visible summaries
- do not collect extra sensitive detail "just in case"

2. Separation of concerns
- scoring should operate on structured events and metadata wherever possible
- raw sensitive content should live in a separate logical storage area from score calculation data

3. Restricted analytics
- analytics may track product usage and derived score outcomes
- analytics must not ingest raw sensitive free-text content

4. Secure access control
- all user data must be scoped by authenticated `user_id`
- backend access control must prevent cross-user access
- transport must use HTTPS

### Data classes

Recommended logical separation:

1. Identity and account
- user profile
- scoring timezone
- preferences

2. Scoring inputs
- onboarding ratings
- daily check-ins
- structured action events
- validation metadata

3. Sensitive content
- journal text
- private notes
- freeform spirituality reflections
- relationship notes
- finance notes
- health notes

4. Derived summaries and analytics
- weekly summaries
- domain scores
- life strength
- evenness
- balanced life score
- aggregate product usage metrics

### Allowed MVP scoring inputs

Safe and acceptable for MVP scoring:
- onboarding rating values
- daily check-in values
- structured action event types
- event timestamps
- awarded points
- validation status
- weekly score summaries

### Not allowed as MVP scoring inputs

The following must not be used as direct scoring inputs in MVP:
- raw journal text
- private note text
- spirituality free-text content
- relationship free-text content
- raw finance notes
- raw health notes

### Analytics boundary

Allowed analytics examples:
- user completed onboarding
- daily check-in submitted
- action type completed
- weekly summary viewed
- score changed by domain
- feature usage frequency

Disallowed analytics examples:
- full journal body
- full relationship note body
- raw finance note text
- raw health note text
- free-text spiritual reflections

### Storage and handling guidance

- store timestamps in UTC
- isolate user records by `user_id`
- avoid writing sensitive raw content into logs, crash reports, or generic analytics events
- cache as little sensitive content as possible on the device
- store auth/session secrets only in secure local storage mechanisms

### MVP consent and user trust

The app should clearly communicate that:
- data is used to calculate scores and provide user-facing summaries
- personal entries remain personal
- analytics are limited to product usage and derived score behavior, not raw private text inspection

### Future AI feature boundary

AI features are appropriate after MVP, but they should be introduced as a separate capability layer with explicit user consent and clear data-use rules.

Recommended future AI guardrails:
- AI processing should be opt-in for sensitive content
- AI features should read from well-scoped content sources only
- AI-generated insights should not silently change core scores unless that behavior is explicitly designed and communicated
- AI summaries, coaching, and pattern detection should be treated as advisory outputs, not hidden scoring inputs, unless a later model revision formally changes that rule

Potential post-MVP AI features:
- journal summarization
- reflective insight generation
- habit-pattern summaries across domains
- personalized coaching suggestions
- weekly narrative recap of progress and imbalance areas

### Architectural note

This privacy model supports future AI features without compromising MVP trust:
- structured scoring remains deterministic
- sensitive content remains isolated
- analytics boundaries stay clear
- later AI services can be added behind explicit consent and controlled data access
