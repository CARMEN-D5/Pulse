# The Big Picture: Building the Balanced Life App

## Overview

This document outlines the complete end-to-end process of building the Balanced Life (BLNC) app, from initial discovery through to deployment and handover. The process is divided into 6 sequential phases, where each phase produces outputs that the next phase depends on.

```
PHASE 1          PHASE 2         PHASE 3         PHASE 4          PHASE 5          PHASE 6
Discovery    →   Design     →    Setup      →    Build       →    Test & Fix  →    Polish & Ship
& Planning       & Prototype     & Architecture  & Integrate      & Validate       & Handover

(What are      (What does     (How does      (Write the      (Does it        (Is it ready
we building?)  it look like?)  it work        actual code)    actually work   for real
                               under the                      for real        users?)
                               hood?)                         users?)
```

---

## PHASE 1: Discovery & Planning

**Goal**: Understand the problem, define scope, organise the team.

### Activities

- Stakeholder meetings — gather requirements
- Define user personas (who uses the app)
- Write user stories ("As a user, I want to take an assessment so I can see my Balance Score")
- Create a product backlog in GitLab with all tasks
- Prioritise features using MoSCoW (Must / Should / Could / Won't)
- Set up sprint milestones and assign tasks
- Identify risks and create a risk register

### Output

A clear backlog of work items, prioritised and estimated, with team roles assigned.

### Skills Needed

| Skill | Why |
|---|---|
| Requirements analysis | Translating stakeholder's vision into buildable tasks |
| User story writing | "As a [user], I want [feature] so that [benefit]" format |
| Agile/Scrum methodology | Sprint planning, backlog grooming, estimation |
| GitLab/project management tool | Issue boards, milestones, labels |
| Planning Poker | Estimating task complexity in story points |

---

## PHASE 2: Design & Prototyping

**Goal**: Design every screen before writing a single line of code.

### Activities

- Create wireframes (low-fidelity sketches of each screen)
- Build a clickable prototype in Figma (high-fidelity, with real colours and layout)
- Design the user flow: Welcome → Signup → Assessment → Results → Dashboard → Check-in → Progress
- Design the Balance Wheel visualisation
- Choose a colour palette, typography, icons
- Get stakeholder approval on designs BEFORE coding
- Create a design system (reusable buttons, cards, input styles)

### Output

A Figma prototype that looks and feels like the real app, with stakeholder sign-off.

### Why This Matters

Coding a screen from an approved design takes 1-2 days. Coding a screen from a vague idea, then redesigning it 3 times, takes 2 weeks. Design first saves massive time.

### Skills Needed

| Skill | Why |
|---|---|
| Figma | Industry-standard design tool for wireframes and prototypes |
| UI design principles | Layout, spacing, hierarchy, colour theory |
| UX design principles | User flows, information architecture, usability |
| Data visualisation | Designing the Balance Wheel, progress charts, score displays |
| Prototyping | Making clickable screen flows for stakeholder review |

---

## PHASE 3: Technical Setup & Architecture

**Goal**: Set up the entire development environment and decide how everything connects.

### Activities

- Choose the tech stack
- Initialise the project repository
- Set up the folder/file structure
- Configure the development environment (linting, formatting, environment variables)
- Set up the database schema (Users, Assessments, CheckIns, Scores)
- Set up authentication (signup, login, logout)
- Set up CI/CD pipeline (auto-run tests and build on every push)
- Set up version control practices (branching strategy, merge request templates)

### System Architecture

```
┌─────────────────────────────────────────┐
│              USER'S PHONE               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     FRONTEND (React Native)       │  │
│  │                                   │  │
│  │  ● Welcome Screen                 │  │
│  │  ● Auth Screens (Login/Signup)    │  │
│  │  ● Assessment Flow (25 questions) │  │
│  │  ● Dashboard                      │  │
│  │  ● Daily Check-In                 │  │
│  │  ● Balance Wheel (Chart)          │  │
│  │  ● Progress Screens               │  │
│  │  ● Profile/Settings               │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
└─────────────────┼────────────────────────┘
                  │ API calls (read/write data)
                  │
┌─────────────────┼────────────────────────┐
│        BACKEND  │ (Firebase / Supabase)  │
│                 ▼                        │
│  ┌──────────────────────────────────┐   │
│  │    AUTHENTICATION                │   │
│  │    Email/Password signup & login │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │    DATABASE                      │   │
│  │                                  │   │
│  │    users                         │   │
│  │    ├── id, name, email           │   │
│  │    ├── created_at                │   │
│  │                                  │   │
│  │    assessments                   │   │
│  │    ├── user_id, date             │   │
│  │    ├── 25 question responses     │   │
│  │    ├── 5 domain scores           │   │
│  │    ├── overall_balance_score     │   │
│  │                                  │   │
│  │    daily_checkins                │   │
│  │    ├── user_id, date             │   │
│  │    ├── spirituality (0/1/2)      │   │
│  │    ├── family (0/1/2)            │   │
│  │    ├── work (0/1/2)              │   │
│  │    ├── health (0/1/2)            │   │
│  │    ├── financial (0/1/2)         │   │
│  │                                  │   │
│  │    score_history                  │   │
│  │    ├── user_id, date             │   │
│  │    ├── 5 domain scores           │   │
│  │    ├── balance_score             │   │
│  │    ├── streak_count              │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │    PUSH NOTIFICATIONS            │   │
│  │    Daily check-in reminder       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Output

A fully configured development environment with repository, database schema, authentication, CI/CD, and branching strategy — ready for the team to start coding.

### Skills Needed

| Skill | Why |
|---|---|
| React Native (or Flutter) | The framework the app is coded in |
| JavaScript/TypeScript | The programming language React Native uses |
| Firebase or Supabase | Backend-as-a-service for auth, database, notifications |
| Database design | Structuring tables, relationships, queries |
| Git & GitLab | Version control, branching, merge requests |
| CI/CD concepts | Automated testing and deployment pipeline |

---

## PHASE 4: Build (Core Development)

**Goal**: Actually code the app, screen by screen, feature by feature.

### Recommended Build Order

Build from easiest to hardest, resolving dependencies as you go:

```
WEEK 1-2:  Foundation
           ├── Project scaffold & navigation setup
           ├── Welcome screen
           ├── Account creation & login (Firebase Auth)
           └── Basic navigation between screens

WEEK 3-4:  Assessment Flow
           ├── Assessment intro screen
           ├── 25-question assessment (progress bar, next/prev)
           ├── Scoring engine (calculate domain scores + balance score)
           ├── Score result screen
           └── Balance Wheel visualisation

WEEK 5-6:  Daily Engagement
           ├── Main dashboard (home screen)
           ├── Daily check-in screen (5 questions, submit)
           ├── Daily scoring system (0/1/2 per domain)
           ├── Rolling 7-day average calculation
           └── Streak tracking

WEEK 7-8:  Progress & Insights
           ├── Progress screen (line charts over time)
           ├── Domain detail screens
           ├── Weekly balance update display
           ├── Smart insight messages (template-based)
           └── Push notification for daily reminder

WEEK 9-10: Polish
           ├── Profile/settings screen
           ├── UI polish, animations, transitions
           ├── Error handling & edge cases
           ├── Performance optimisation
           └── Bug fixes from testing
```

### Output

A working app with all 13 screens functional, connected to a real backend, with scoring engine, daily check-ins, and progress tracking.

### Skills Needed

| Skill | Why |
|---|---|
| React Native components | Building screens, buttons, forms, lists, modals |
| State management (Context API or Redux) | Managing user data, scores, and check-in state across screens |
| React Navigation | Moving between screens (stack, tab, drawer navigation) |
| API integration | Reading/writing data to Firebase/Supabase |
| Charting library (Victory Native or similar) | Balance Wheel radar chart, progress line charts |
| Form handling | Assessment questions, check-in inputs, signup forms |
| Async storage / local caching | Storing data offline, handling no-internet scenarios |
| Push notifications (Expo or Firebase Cloud Messaging) | Daily check-in reminders |
| Scoring algorithm logic | Implementing the assessment scorer, rolling average, streak counter |

---

## PHASE 5: Test & Validate

**Goal**: Make sure everything works correctly and users can actually use it.

### Activities

- **Unit testing**: Test the scoring engine — does `[7.5, 5, 7.5, 5, 5]` produce domain score `6.0`?
- **Integration testing**: Does submitting a check-in actually update the database and recalculate the score?
- **UI testing**: Does every screen render correctly? Do buttons work? Does navigation flow properly?
- **Usability testing**: Give the app to 5-10 real people. Watch them use it. Note where they get confused.
- **Edge case testing**: What happens with no internet? What if a user never takes the assessment? What if they submit 2 check-ins in one day?
- **Bug fixing**: Fix everything discovered during testing.

### Output

A stable, tested app with known bugs fixed, edge cases handled, and usability feedback incorporated.

### Skills Needed

| Skill | Why |
|---|---|
| Jest (unit testing) | Testing scoring logic, utility functions |
| React Native Testing Library | Testing component rendering and interactions |
| Manual QA testing | Walking through every screen, every flow, every edge case |
| Usability testing methods | Observing real users, collecting feedback |
| Debugging | Reading error logs, fixing crashes, resolving state bugs |

---

## PHASE 6: Polish, Document & Handover

**Goal**: Prepare the project for submission and stakeholder handover.

### Activities

- Final UI polish (consistent spacing, fonts, colours)
- Write technical documentation (how to run the project, architecture overview)
- Prepare Sprint Grade Case (evidence of work across all sprints)
- Record demo video or prepare live demo
- Deploy to a testable environment (Expo Go for mobile, or web deployment)
- Handover documentation for stakeholder (how to continue development after you leave)

### Output

A polished, documented, deployable MVP ready for stakeholder use, with all academic submissions prepared.

### Skills Needed

| Skill | Why |
|---|---|
| Technical writing | Documentation, README, architecture docs |
| Deployment | Publishing the app to a test environment |
| Presentation skills | Sprint demos, stakeholder reviews, Sprint Grade Case |

---

## COMPLETE SKILLS SUMMARY

### Programming & Frameworks

| Skill | Level Needed | What It's Used For |
|---|---|---|
| JavaScript / TypeScript | Strong | The core language for everything |
| React Native | Strong | Building all 13 app screens |
| React concepts (hooks, state, props, context) | Strong | Component logic, data flow |
| Firebase / Supabase | Moderate | Auth, database, notifications |
| SQL or NoSQL (depending on backend choice) | Moderate | Querying and storing user data |

### Design & UX

| Skill | Level Needed | What It's Used For |
|---|---|---|
| Figma | Moderate | Wireframes, prototypes, design system |
| UI/UX design principles | Basic-Moderate | Creating usable, attractive interfaces |
| Data visualisation | Basic | Balance Wheel, progress charts |

### DevOps & Tools

| Skill | Level Needed | What It's Used For |
|---|---|---|
| Git | Strong | Version control, branching, merging |
| GitLab | Moderate | Issue tracking, CI/CD, project management |
| CI/CD pipelines | Basic | Automated builds and tests |

### Process & Methodology

| Skill | Level Needed | What It's Used For |
|---|---|---|
| Agile / Scrum | Moderate | Sprint planning, retrospectives, reviews |
| User story writing | Basic | Defining backlog items |
| Risk management | Basic | Identifying and mitigating project risks |

### Testing

| Skill | Level Needed | What It's Used For |
|---|---|---|
| Unit testing (Jest) | Basic-Moderate | Testing scoring engine and utilities |
| Manual QA | Basic | Verifying all screens and flows work |
| Usability testing | Basic | Validating with real users |

---

## LEARNING PRIORITY (If You Have Limited Experience)

If your team is still building skills, focus in this order:

1. **JavaScript + React fundamentals** — without this, nothing else matters
2. **React Native basics** — building screens, navigation, forms
3. **Firebase setup** — auth + database (plenty of tutorials for this exact combo)
4. **Git** — you'll use this every single day
5. **Figma** — even basic wireframes save enormous time

Everything else can be learned as you go during the sprints.
