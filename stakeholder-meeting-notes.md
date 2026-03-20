# Stakeholder Meeting Notes — 17 March 2026

## Product: Balanced Life (BLNC) / PULSE

---

## 1. THE 5 LIFE DOMAINS (Updated from meeting)

| # | Domain | Measures |
|---|--------|----------|
| 1 | Spirituality | Purpose, meaning, inner peace, values alignment |
| 2 | Family & Friends | Relationship strength, social connection, support |
| 3 | Work / Productivity | Work satisfaction, motivation, workload, productivity |
| 4 | Health | Physical health, exercise, stress, sleep, mental/emotional wellbeing |
| 5 | Financial | Financial security, expense management, future stability, saving |

---

## 2. STARTING ASSESSMENT

- **25 questions total** (5 per domain)
- Each question scored **1–5** (Never → Always)
- Converted to **0–10 scale**: Never=0, Rarely=2.5, Sometimes=5, Often=7.5, Always=10
- **Domain Score** = average of 5 question scores per domain
- **Overall Balance Score** = average of 5 domain scores

### Assessment Questions by Domain

#### Spirituality
1. How often do you feel your life has meaning or purpose?
2. How often do you reflect on your personal values or beliefs?
3. How often do you experience inner peace or calm?
4. How often do you engage in activities that nourish your spirit?
5. How aligned do you feel your daily actions are with your values?

#### Family & Friends
1. How satisfied are you with your relationships with family or close friends?
2. How often do you spend meaningful time with people important to you?
3. How supported do you feel by family or friends?
4. How comfortable are you sharing personal challenges with someone close?
5. How connected do you feel to the people who matter most in your life?

#### Work / Productivity
1. How satisfied are you with your work, study, or daily responsibilities?
2. How motivated do you feel about your work or goals?
3. How manageable is your workload?
4. How productive do you feel most days?
5. How meaningful do you find your work or daily activities?

#### Health
1. How would you rate your overall physical health?
2. How often do you engage in physical activity or exercise?
3. How well do you manage stress in your daily life?
4. How well do you sleep most nights?
5. How would you rate your overall mental and emotional wellbeing?

#### Financial
1. How secure do you feel about your current financial situation?
2. How well are you able to manage your expenses?
3. How confident are you about your future financial stability?
4. How often do financial worries cause you stress?
5. How satisfied are you with your ability to save or build financial security?

---

## 3. DAILY CHECK-IN SYSTEM

- **Frequency**: Once per day, triggered by push notification
- **Duration**: 30–60 seconds
- **Format**: 5 questions (1 per domain), 3 answer options each

### Daily Questions
1. Spirituality: "Did you do something today that connected you to your values or sense of purpose?"
2. Family & Friends: "Did you connect with family or friends today?"
3. Work: "Did you make meaningful progress in your work or responsibilities today?"
4. Health: "Did you take care of your physical or mental health today?"
5. Financial: "Did you make a positive financial decision today?"

### Daily Scoring
- No = 0 points
- A little = 1 point
- Yes = 2 points
- Max per day: 10 points (5 domains × 2)

### Domain Score Update (Rolling 7-day average)
- Formula: (weekly total ÷ 14) × 10
- Example: Health weekly total = 10 → (10 ÷ 14) × 10 = 7.1

---

## 4. BALANCE SCORE CALCULATION

- **Balance Score** = average of all 5 domain scores (0–10 scale)
- **Imbalance Detection**: Measure gap between highest and lowest domain
  - Large gaps = life imbalance
  - App should highlight strong domains AND weak domains

---

## 5. ENGAGEMENT FEATURES

- **Daily Streak System**: Consecutive check-in days, broken by missed days
- **Weekly Balance Update**: Shows per-domain change (+/- from last week)
- **Smart Insights**: AI/rule-based messages about score trends
- **Visual Progress Chart**: Balance Score over time (line chart, weekly)

---

## 6. MVP SCREEN BLUEPRINT (13 Screens)

1. Welcome Screen — app intro, 5 domain overview, start button
2. Account Creation — name, email, password, login option
3. Assessment Intro — explanation screen before questions
4. Assessment Questions — 25 questions with progress bar, next/prev
5. Balance Score Result — scores per domain, overall score, strongest/weakest
6. Balance Wheel — visual radar/wheel chart showing domain distribution
7. Main Dashboard — daily home screen with scores, check-in button, progress link
8. Daily Check-In — 5 domain questions, submit button
9. Daily Insight — post-check-in feedback, streak counter
10. Progress Screen — line chart, weekly trends, domain progress link
11. Domain Detail — individual domain deep dive, recent activity, suggestions
12. Profile/Settings — name, email, notifications, data export, privacy, logout

### App Flow
Download → Welcome → Create Account → Assessment → Score Result → Balance Wheel → Dashboard → Daily Check-In → Progress Tracking

---

## 7. TECHNICAL DIRECTION

- **Frontend**: React Native or Flutter
- **Backend**: Firebase (suggested)
- **Database tables needed**:
  - Users
  - Assessment Answers
  - Daily Check-ins (user_id, date, 5 domain scores)
  - Domain Scores
  - Balance Score History

---

## 8. MVP REQUIREMENTS (Stakeholder-defined)

Users must be able to:
1. ✅ Create account
2. ✅ Take assessment (25 questions)
3. ✅ See balance score
4. ✅ Complete daily check-ins
5. ✅ Track progress

---

## 9. OPEN QUESTIONS (Still need clarification)

### 9.1 — CRITICAL: Financial Question 4 is Reverse-Scored

**The Question**: "How often do financial worries cause you stress?"

**The Problem**: Every other question in the entire assessment is positively framed — a higher answer (Always = 10) means the user is doing well. But this question is the opposite. Someone who answers "Always" to financial stress is doing BADLY, yet the current scoring system would give them a 10/10 for that question, inflating their Financial domain score.

**Example of the bug**:
- A user is financially struggling, answers "Always" to stress → scores 10
- A financially secure user answers "Never" to stress → scores 0
- This is backwards. The stressed user gets a HIGHER financial score than the secure one.

**Why this matters for development**: If we code the scoring engine using the same formula for all 25 questions, this one question will produce incorrect results for every single user. The Financial domain score will be mathematically wrong. Since the Balance Score depends on all 5 domain scores, the overall Balance Score will also be wrong.

**What we need from the stakeholder**: Confirm one of these approaches:
1. **Invert the score** for this question (Never=10, Rarely=7.5, Sometimes=5, Often=2.5, Always=0)
2. **Reword the question** to be positive (e.g., "How often do you feel free from financial stress?")
3. **Keep it as-is** intentionally (unlikely, but need confirmation)

**Priority**: MUST resolve before coding the scoring engine.

---

### 9.2 — CRITICAL: What Happens on Missed Check-In Days?

**The Problem**: The daily check-in uses a rolling 7-day average with the formula `(weekly total ÷ 14) × 10`. The number 14 assumes the user checked in all 7 days (7 days × max 2 points = 14). But what if a user only checks in 4 out of 7 days?

**Scenario**: A user checks in Monday to Thursday, all "Yes" (2 points each), then misses Friday to Sunday.
- **If missed days count as 0**: Total = 8, score = (8 ÷ 14) × 10 = **5.7** — user gets punished for missing days even though they performed perfectly when they did check in.
- **If missed days are excluded**: Total = 8, divisor = 8 (4 days × 2), score = (8 ÷ 8) × 10 = **10.0** — user gets a perfect score despite only engaging 4 of 7 days.
- **Hybrid approach**: Only divide by days checked in × 2, but apply a small penalty for missed days.

**Why this matters for development**: This fundamentally changes the database query and score calculation logic. Treating missed days as 0 is simpler to code (just sum the week and divide by 14). Excluding missed days requires tracking which days had check-ins and dynamically adjusting the divisor. The hybrid approach is the most complex.

**Why this matters for user experience**: If missed days count as 0, casual users will see their scores drop every time they skip a day, which may feel punishing and cause them to abandon the app. If missed days are excluded, users have no incentive to check in daily, which undermines the entire engagement model. This directly affects user retention.

**What we need from the stakeholder**: A clear decision on the missed-day policy so we can code the formula correctly and design the UX messaging around it.

**Priority**: MUST resolve before implementing the rolling average system.

---

### 9.3 — CRITICAL: Assessment Score vs. Daily Check-In Score Blending

**The Problem**: A new user completes the 25-question assessment and gets initial domain scores (e.g., Health = 6.0). Then they start doing daily check-ins. After 3 days, how is the Health domain score calculated? Is it:
1. **Pure daily check-in** (assessment score is immediately replaced after the first check-in week)?
2. **Weighted blend** (e.g., 70% assessment + 30% daily for week 1, gradually shifting to 100% daily by week 4)?
3. **Assessment as baseline** (daily check-ins only modify the score up or down from the assessment starting point)?

**Why this matters for development**: Each approach requires a different data model and algorithm:
- Option 1 is simple — just overwrite. But the score will swing wildly in the first week because you're averaging only 1-3 data points.
- Option 2 requires a blending weight that changes over time, adding complexity to the score calculation.
- Option 3 requires storing the assessment baseline permanently and calculating daily deltas.

**Why this matters for user experience**: If a user scores 6.0 on Health in the assessment, then checks in "Yes" for Health 3 days in a row, they expect their score to go UP. But if we switch to pure daily scoring too early, their score would be (6 ÷ 14) × 10 = 4.3 — it actually went DOWN despite positive behaviour. That is confusing and demoralising.

**What we need from the stakeholder**: A clear transition rule from assessment scoring to daily scoring.

**Priority**: MUST resolve before implementing score updates.

---

### 9.4 — HIGH: Target User Persona

**The Problem**: The stakeholder described WHAT the app does but not WHO specifically it is for. The project description says "individual users and preventative wellbeing settings" which is extremely broad and encompasses almost every adult human.

**Why this matters for development**: The target user drives every design decision in the app:
- **Visual design**: A 20-year-old uni student expects a modern, vibrant, possibly gamified UI. A 45-year-old corporate professional expects a clean, minimal, serious interface. A 60-year-old retiree needs larger fonts, simpler navigation, and higher contrast.
- **Tone of voice**: "Hey! Great job checking in 🎉" vs. "Well done. Your consistency is paying off." — same message, completely different personality.
- **Notification timing**: Students are active at 11pm. Professionals check phones at 7am. Retirees are active midday. Default notification time should match the primary user.
- **Content of micro-actions**: Financial advice for a student (budget your meal plan) is completely different from a professional (maximise your superannuation).
- **Onboarding complexity**: Tech-savvy users tolerate complex onboarding. Less tech-savvy users need simpler flows.

**What we need from the stakeholder**: At minimum, an age range, occupation type, and 2-3 primary pain points of the ideal first user. Ideally a full persona (name, age, job, goals, frustrations, tech comfort level).

**Priority**: HIGH — affects all UI/UX design work. Should resolve before wireframing begins.

---

### 9.5 — HIGH: Branding Assets

**The Problem**: To build any screen, we need visual foundations — logo, colour palette, typography, and tone of voice. The stakeholder has a website (thebalancedlife.com.au) which likely has some branding, but we don't know if those brand elements should carry over to the app, or if the app has its own identity.

**Why this matters for development**: Without branding, we have two options:
1. **Build with placeholder styling** and reskin later — this means doing the visual work twice, wasting sprint time.
2. **Design our own branding** and propose it to the stakeholder — this is valuable portfolio work but takes 1-2 weeks and the stakeholder might reject it.

Having brand assets upfront means every screen we build from day one looks like the final product. Demos to the stakeholder look polished. Sprint reviews are more impressive. All of this feeds into the "Execution & Quality" rubric criterion which is worth 40% of our grade.

**What we need from the stakeholder**: Logo files (PNG/SVG), primary/secondary colours (hex codes), font preferences, and any brand guidelines document. If none exist, we need permission and direction to create them.

**Priority**: HIGH — blocks all UI implementation.

---

### 9.6 — HIGH: Design Style Preference

**The Problem**: A wellbeing app can take many visual approaches, and each one creates a fundamentally different product feel:
- **Minimal/calm** (like Calm or Headspace): Soft colours, lots of white space, gentle animations. Communicates serenity and trustworthiness.
- **Gamified/playful** (like Duolingo or Finch): Bright colours, characters, badges, celebrations. Communicates fun and motivation through rewards.
- **Clinical/professional** (like MyFitnessPal): Data-heavy, charts, precise numbers. Communicates seriousness and accuracy.
- **Warm/supportive** (like Daylio): Friendly illustrations, encouraging language, emoji-style inputs. Communicates empathy and approachability.

**Why this matters for development**: The design style affects component library choice, animation complexity, illustration needs (do we need custom illustrations or icons?), and overall development time. A gamified app with animations takes significantly longer to build than a minimal app with simple cards.

**What we need from the stakeholder**: Which style resonates most, or 2-3 example apps they admire visually. Screenshots of apps they like would be even better.

**Priority**: HIGH — blocks UI design work.

---

### 9.7 — MEDIUM: Third-Party Integrations

**The Problem**: The Health domain tracks physical activity and exercise. The Financial domain tracks spending. These could be manually self-reported (as the current design suggests) or automatically pulled from external services like Apple Health, Google Fit, or banking APIs.

**Why this matters for development**: Each integration is a significant engineering effort:
- **Apple Health / Google Fit**: Requires native device APIs, platform-specific code, permission handling, and data syncing. Adds 2-4 weeks of development. Also means you can't build a web-only app — it must be native mobile.
- **Banking APIs**: Extremely complex. Requires financial data aggregation services (like Basiq in Australia), security certifications, and sensitive data handling. Probably not feasible for an MVP.
- **Calendar integration**: For Work/Productivity tracking. Requires OAuth with Google Calendar or Outlook. Medium complexity.
- **No integrations**: The simplest path. All data is self-reported through the daily check-in. This matches the current stakeholder spec perfectly and is achievable for MVP.

**What we need from the stakeholder**: Confirmation that self-reported data is sufficient for the MVP, or if any specific integration is expected. If integrations are desired, which ones are must-have vs. future roadmap.

**Priority**: MEDIUM — the current spec implies no integrations, but worth confirming. Affects architecture decisions.

---

### 9.8 — MEDIUM: Data Privacy Requirements

**The Problem**: This app collects sensitive personal information — mental health status, financial stress levels, relationship satisfaction, and daily behavioural data. In Australia, the Privacy Act 1988 (and the Australian Privacy Principles) governs how personal information is collected, used, stored, and disclosed.

**Why this matters for development**: Privacy requirements affect:
- **Data storage location**: Must data stay in Australian servers? Firebase's default region may be US-based. We may need to configure Asia-Pacific regions.
- **Encryption**: Should data be encrypted at rest and in transit? (Best practice says yes, but adds implementation complexity.)
- **Data retention**: How long do we keep user data? Can users request deletion? GDPR-style "right to be forgotten" may apply.
- **Privacy policy**: The app will need a privacy policy screen. Who writes it — us or the stakeholder?
- **Anonymous vs. identified data**: If the stakeholder wants to analyse aggregated user data later, we need to design the database to support anonymisation.

**What we need from the stakeholder**: Their expectations around data privacy, whether they have legal counsel advising on this, and whether they want us to implement specific privacy features (data export, account deletion, consent tracking) in the MVP.

**Priority**: MEDIUM — won't block initial development but affects database design and must be resolved before any real user testing.

---

### 9.9 — MEDIUM: Communication Preferences

**The Problem**: The TechLauncher rubric allocates 20% of the grade to Stakeholder Engagement, which includes "regular engagement," "exceptional communication," and "fully effective practices to manage expectations." We need a structured communication rhythm with the stakeholder to score well here.

**Why this matters for the grade**: Without agreed-upon communication norms, common problems arise:
- Messages go to wrong channels and get missed.
- Meetings aren't scheduled regularly, creating long feedback gaps.
- The stakeholder feels out of the loop, or conversely, feels bombarded.
- Feedback arrives too late to incorporate into the current sprint.

**What we need from the stakeholder**:
- **Meeting frequency**: Weekly, fortnightly, or per-sprint (every 3 weeks)?
- **Preferred channel**: Email, Slack, WhatsApp, Teams, Discord?
- **Async feedback**: Can we send Figma links / screenshots for async review between meetings?
- **Response time expectation**: If we send a question, how quickly can we expect a reply?
- **Availability windows**: Are there days/times that work best or worst for meetings?

**Priority**: MEDIUM — doesn't block development but directly impacts 20% of our grade. Should establish in the next communication with the stakeholder.

---

### 9.10 — MEDIUM: Pilot User Access for Testing

**The Problem**: The rubric under Execution & Quality values real-world validation. The stakeholder mentioned they completed consumer surveys, which means they have a pool of people who have already expressed interest in the product. These people are ideal testers.

**Why this matters for development**: Usability testing with real users is the difference between building something that works technically and building something people actually want to use. If we can test with 5-10 real users:
- We discover UX problems before they become deeply embedded in the code.
- We get feedback on the assessment questions — are they clear? Do users understand the scoring?
- We validate the daily check-in flow — is 30 seconds realistic? Do users find the questions meaningful?
- We can include testing evidence in our Sprint Grade Case, which strengthens the "Execution & Quality" argument.

**What we need from the stakeholder**: Whether they can provide access to interested users from their survey pool, how many users we could test with, and whether there are any consent/ethics requirements for user testing (since this is a university project, ANU may have ethics approval requirements for user research).

**Priority**: MEDIUM — not needed immediately but should arrange by mid-semester for testing phases.

---

### 9.11 — MEDIUM: IP and Portfolio Usage Rights

**The Problem**: The project brief states "students assign IP to stakeholder," meaning the stakeholder owns everything we build. This is normal for client projects. However, as Master's students, this project is a major portfolio piece for job applications.

**Why this matters for us personally**: After the semester ends, we need to know:
- Can we include screenshots of the app in our personal portfolios?
- Can we describe the project in job interviews and on LinkedIn?
- Can we show the code (or snippets) in technical interviews?
- Can we include the project in our university thesis or capstone documentation?
- Can we use the work as a case study on personal websites?

If the answer is "no" to all of these, the project still has academic value, but its career value is significantly reduced. Most stakeholders are happy to allow portfolio usage with a disclaimer, but it needs to be explicitly agreed upon.

**What we need from the stakeholder**: A clear statement on what we can and cannot share publicly after the project ends.

**Priority**: MEDIUM — doesn't affect development at all, but important for our careers. Better to clarify early than assume.

---

### 9.12 — MEDIUM: Compensation Structure Details

**The Problem**: The project brief confirms "Yes" to compensation/remuneration, but provides no details on the structure.

**Why this matters**: Without clarity, money becomes a source of ambiguity and potential friction:
- Is it a flat amount per team, or per individual student?
- Is it paid as a lump sum at the end, or in milestones (e.g., after assessment feature is built, after MVP is delivered)?
- Is there a contract or written agreement?
- What happens if a team member drops the course — does the remaining team get the same total?
- Are there performance bonuses or is it fixed regardless of quality?

**What we need from the stakeholder**: The total amount, how it's distributed, when it's paid, and whether there's a written agreement. If the stakeholder prefers milestone-based payment, we should align milestones with our sprint schedule.

**Priority**: MEDIUM — doesn't block development, but unresolved compensation questions can create team tension. Best resolved in the first 2 weeks.

---

### 9.13 — MEDIUM: Balance Wheel Visual Style

**The Problem**: The stakeholder describes the Balance Wheel as "very powerful" and a key screen, but doesn't specify the exact visualisation type. There are several common options:
- **Radar/Spider chart**: 5 axes radiating from a centre point, with a filled polygon showing scores. This is the most common "life wheel" visualisation and probably what the stakeholder imagines.
- **Pie/Donut chart**: 5 segments of equal size, with fill level showing score. Less intuitive for comparison.
- **Bar chart**: 5 horizontal or vertical bars. Simple and clear but less visually striking.
- **Custom wheel**: A literal wheel divided into 5 segments with colour-coded fill levels. More unique but requires custom graphics.

**Why this matters for development**: A radar chart is available in most charting libraries (e.g., Victory Native, react-native-chart-kit) and takes a few hours to implement. A custom wheel visualisation might require SVG drawing or canvas work, taking days. Choosing the wrong one means rebuilding it later.

**What we need from the stakeholder**: A visual reference or sketch of what they imagine. Even sending them 3-4 examples of different chart types and asking "which one?" would work.

**Priority**: MEDIUM — blocks the Balance Wheel screen design, but other screens can be built first.

---

### 9.14 — LOW: How Smart Insights Should Be Generated

**The Problem**: The stakeholder wants post-check-in insight messages like "Your Health score improved this week. Small daily actions are helping your overall balance." But the generation method isn't specified.

**Options with different complexity levels**:
- **Hard-coded messages** (simplest): Write 20-30 fixed messages. Show them based on simple conditions (score went up → show encouragement message). Takes 1-2 days to implement.
- **Template-based** (moderate): Create message templates with variables: "Your {domain} score {increased/decreased} by {amount} this week." More dynamic, handles all domains automatically. Takes 2-3 days.
- **Rule engine** (moderate-high): Define rules like "if domain score < 4 AND trending down for 2 weeks, show warning message." Provides more nuanced, context-aware insights. Takes 1 week.
- **AI/LLM-generated** (complex): Use an AI model to generate personalised insights based on all user data. Most impressive but requires API integration, costs money per request, and adds latency. Takes 2+ weeks and has ongoing costs.

**Why this matters for development**: The choice affects development time (1 day vs 2 weeks), ongoing costs (free vs API fees), and user experience quality. For an MVP, template-based is the sweet spot — dynamic enough to feel personalised, simple enough to build quickly.

**What we need from the stakeholder**: Confirmation that template-based insights are sufficient for MVP, or if they have a strong preference for another approach.

**Priority**: LOW — the insight system is a polish feature. The core app works without it. Can implement a simple version first and enhance later.

---

### 9.15 — LOW: Accessibility Requirements

**The Problem**: A wellbeing app should be usable by everyone, including people with visual impairments, motor difficulties, or cognitive challenges. Accessibility isn't mentioned in the stakeholder's spec at all.

**Why this matters**: Building accessibility in from day one is dramatically easier than retrofitting. Key considerations:
- **Screen reader support**: All buttons and images need aria labels. Assessment questions need to be navigable by VoiceOver/TalkBack.
- **Colour contrast**: Score displays and domain colours must meet WCAG AA contrast ratios (4.5:1 minimum). This affects our colour palette choice.
- **Touch targets**: Buttons need to be at least 44×44 points for users with motor impairments. The daily check-in radio buttons (No / A little / Yes) must be large enough.
- **Font scaling**: The app should respect system font size settings for users who need larger text.
- **Motion sensitivity**: Animations (like the Balance Wheel) should respect "reduce motion" system settings.

**What we need from the stakeholder**: Whether accessibility is a priority for MVP, or if it's a post-launch enhancement. Even a basic answer helps us decide whether to invest time in accessibility testing during sprints.

**Priority**: LOW for asking (we should build with basic accessibility regardless as good engineering practice), but good to confirm stakeholder expectations.
