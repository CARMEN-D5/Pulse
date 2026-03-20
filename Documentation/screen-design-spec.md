# Balanced Life App — Screen Design Specification

## Document Purpose

This document provides a detailed, screen-by-screen design blueprint for the Balanced Life (BLNC) app. Each screen is described with its purpose, layout, content, interactions, animations, edge cases, and navigation behaviour. This spec serves as the single source of truth for both Figma design and frontend development.

---

## Design Language (Global)

Before diving into screens, these are the design principles that apply across the entire app:

- **Rounded corners everywhere** — cards, buttons, inputs, charts (border-radius: 12-16px)
- **Soft shadows** — subtle elevation on cards and floating elements
- **Generous spacing** — breathable layout, never cramped
- **Domain colour system** — each of the 5 domains has a consistent colour used everywhere:
  - Spirituality → Deep Purple (#7C3AED)
  - Family & Friends → Warm Coral (#F97066)
  - Work / Productivity → Amber Gold (#F59E0B)
  - Health → Fresh Green (#10B981)
  - Financial → Ocean Blue (#3B82F6)
- **Typography hierarchy** — 3 levels: headings (bold, large), body (regular, medium), captions (light, small)
- **Micro-interactions** — subtle haptic feedback on taps, smooth transitions between screens

---

## Screen 1: Splash Screen

### Purpose
The very first thing users see when the app opens. Creates a premium first impression and handles background loading (checking auth state, loading cached data).

### Layout
```
┌──────────────────────────────┐
│                              │
│                              │
│                              │
│                              │
│         [App Logo]           │
│                              │
│       BALANCED LIFE          │
│                              │
│    ● ● ● (loading dots)     │
│                              │
│                              │
│                              │
│                              │
└──────────────────────────────┘
```

### Content
- App logo centred vertically and horizontally
- "BALANCED LIFE" in clean, spaced-out lettering below the logo
- Subtle loading animation (3 pulsing dots or a thin progress bar)

### Animation
- Logo fades in from 0% to 100% opacity over 0.8 seconds
- App name slides up from below the logo with a 0.3s delay
- Loading dots pulse in sequence (left → middle → right)
- After loading completes, the entire screen fades out and transitions to the Welcome Screen (if first-time user) or Dashboard (if returning user)

### Behaviour
- If user is already logged in → navigate to Dashboard
- If user is new or logged out → navigate to Welcome Screen
- Maximum display time: 3 seconds (even if loading isn't complete, transition anyway)

### Edge Cases
- No internet connection: Still show splash, then navigate normally (app should work with cached data where possible)
- Slow connection: Show splash for up to 3 seconds, then navigate regardless

---

## Screen 2: Welcome Screen (Onboarding)

### Purpose
Introduce new users to the app concept, build excitement, and explain the value proposition before they create an account. This is the app's "sales pitch."

### Layout — Multi-page carousel (3 pages, swipeable)

#### Page 1: The Problem
```
┌──────────────────────────────┐
│                              │
│     [Illustration:           │
│      Person juggling         │
│      multiple app icons]     │
│                              │
│   Life is complex.           │
│   Your wellbeing shouldn't   │
│   be scattered across        │
│   ten different apps.        │
│                              │
│                              │
│         ● ○ ○                │
│                              │
│      [ Get Started ]         │
│       Skip                   │
└──────────────────────────────┘
```

#### Page 2: The Solution
```
┌──────────────────────────────┐
│                              │
│     [Illustration:           │
│      5 domains as a          │
│      balanced wheel]         │
│                              │
│   Five areas. One score.     │
│   Balanced Life measures     │
│   what matters most:         │
│                              │
│   🟣 Spirituality            │
│   🔴 Family & Friends        │
│   🟡 Work                    │
│   🟢 Health                  │
│   🔵 Financial               │
│                              │
│         ○ ● ○                │
│                              │
│      [ Get Started ]         │
│       Skip                   │
└──────────────────────────────┘
```

#### Page 3: The Promise
```
┌──────────────────────────────┐
│                              │
│     [Illustration:           │
│      Person with rising      │
│      balance score graph]    │
│                              │
│   30 seconds a day.          │
│   Real change over time.     │
│                              │
│   Take a quick assessment,   │
│   check in daily, and watch  │
│   your life come into        │
│   balance.                   │
│                              │
│         ○ ○ ●                │
│                              │
│   [ Create Account ]         │
│   Already have one? Log In   │
└──────────────────────────────┘
```

### Interactions
- Swipe left/right to navigate between pages
- Dot indicators update to show current page
- "Skip" link on pages 1-2 jumps directly to page 3
- "Get Started" on pages 1-2 advances to next page
- "Create Account" button navigates to Account Creation screen
- "Log In" text link navigates to Login screen

### Animation
- Pages slide horizontally with momentum-based scrolling
- Illustrations have a subtle parallax effect (foreground moves faster than background)
- Domain list on page 2 fades in one by one with a stagger delay (0.1s between each)
- Dot indicators animate smoothly between positions

---

## Screen 3: Account Creation

### Purpose
Collect minimum information needed to create a user account. Keep it fast — every extra field increases drop-off.

### Layout
```
┌──────────────────────────────┐
│  ←                           │
│                              │
│   Create Your Account        │
│                              │
│   Start your journey to      │
│   a more balanced life.      │
│                              │
│   ┌────────────────────────┐ │
│   │ Full Name              │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │ Email Address          │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │ Password          👁   │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │ Confirm Password  👁   │ │
│   └────────────────────────┘ │
│                              │
│   [ Create Account ]         │
│                              │
│   ─── or continue with ───   │
│                              │
│   [G] Google  [A] Apple      │
│                              │
│   Already have an account?   │
│   Log In                     │
└──────────────────────────────┘
```

### Content & Fields
- **Full Name**: Text input, required, minimum 2 characters
- **Email Address**: Email input, required, validated format
- **Password**: Secure input with show/hide toggle (eye icon), minimum 8 characters
- **Confirm Password**: Must match password field
- **Create Account**: Primary action button, disabled until all fields are valid
- **Social login options**: Google and Apple sign-in buttons (secondary style)
- **Log In link**: For returning users who landed here by mistake

### Validation
- Real-time validation as user types (debounced 500ms)
- Name field: Shows green checkmark when valid
- Email field: Shows error if invalid format, shows green checkmark when valid
- Password field: Shows strength indicator below (Weak / Fair / Strong / Very Strong)
  - Weak: < 8 chars
  - Fair: 8+ chars, only letters
  - Strong: 8+ chars, letters + numbers
  - Very Strong: 8+ chars, letters + numbers + special characters
- Confirm Password: Shows error "Passwords don't match" if mismatched, green checkmark when matching

### Interactions
- Back arrow (←) returns to Welcome Screen
- Keyboard automatically shows when screen appears, focused on Name field
- "Next" on keyboard advances to next field
- "Create Account" button shows loading spinner while request processes
- On success: Navigate to Assessment Intro screen
- On error: Show inline error message (e.g., "Email already registered. Try logging in instead.")

### Edge Cases
- User enters email that already exists → show error with "Log In" link
- Network failure during account creation → show retry option
- User navigates back → form state should be preserved (not cleared)

---

## Screen 4: Login

### Purpose
Allow returning users to access their account.

### Layout
```
┌──────────────────────────────┐
│  ←                           │
│                              │
│   Welcome Back               │
│                              │
│   Log in to continue your    │
│   balance journey.           │
│                              │
│   ┌────────────────────────┐ │
│   │ Email Address          │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │ Password          👁   │ │
│   └────────────────────────┘ │
│                              │
│   Forgot Password?           │
│                              │
│   [ Log In ]                 │
│                              │
│   ─── or continue with ───   │
│                              │
│   [G] Google  [A] Apple      │
│                              │
│   Don't have an account?     │
│   Create Account             │
└──────────────────────────────┘
```

### Interactions
- "Forgot Password?" opens a bottom sheet asking for email, then sends reset link
- "Log In" shows loading spinner, then navigates to Dashboard on success
- Failed login → shake animation on the form + error message "Incorrect email or password"
- 3 consecutive failed attempts → show "Too many attempts. Try again in 30 seconds."

---

## Screen 5: Assessment Intro

### Purpose
Prepare the user mentally for the 25-question assessment. Set expectations about duration and purpose so they don't abandon halfway.

### Layout
```
┌──────────────────────────────┐
│                              │
│                              │
│     [Illustration:           │
│      Balanced scale or       │
│      person with clipboard]  │
│                              │
│   Life Balance Assessment    │
│                              │
│   Let's find out where your  │
│   life is in balance — and   │
│   where it needs attention.  │
│                              │
│   ┌────────────────────────┐ │
│   │ 📋 25 quick questions  │ │
│   │ ⏱  Takes ~2 minutes    │ │
│   │ 🎯 Your starting score │ │
│   └────────────────────────┘ │
│                              │
│   Answer honestly — there    │
│   are no right or wrong      │
│   answers. This is just      │
│   about understanding where  │
│   you are today.             │
│                              │
│   [ Start Assessment ]       │
│                              │
└──────────────────────────────┘
```

### Content
- Reassuring, friendly tone
- Three key facts in an info card: question count, time estimate, and what they'll get
- Encouragement to answer honestly
- No back button — this is a one-way entry point (user just created their account)

### Animation
- Info card items appear one by one with a fade-up stagger
- "Start Assessment" button has a subtle pulsing glow to draw attention

### Interactions
- "Start Assessment" navigates to the first assessment question
- No skip option — the assessment is required for the app to function

---

## Screen 6: Assessment Questions

### Purpose
Walk the user through all 25 questions, one at a time, with clear progress indication and domain context.

### Layout
```
┌──────────────────────────────┐
│  ←     Spirituality    3/25  │
│                              │
│  ████████░░░░░░░░░░░░░░░░░░ │
│                              │
│                              │
│   How often do you           │
│   experience inner peace     │
│   or calm?                   │
│                              │
│                              │
│   ┌────────────────────────┐ │
│   │      Never             │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │      Rarely            │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │      Sometimes         │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │      Often             │ │
│   └────────────────────────┘ │
│                              │
│   ┌────────────────────────┐ │
│   │      Always            │ │
│   └────────────────────────┘ │
│                              │
│                              │
│   [ Previous ]    [ Next ]   │
└──────────────────────────────┘
```

### Header
- Back arrow (←): Goes to previous question (or Assessment Intro if on question 1)
- Domain name: Shows which domain the current question belongs to, displayed in that domain's colour
- Question counter: "3/25" format
- Progress bar: Fills proportionally (e.g., 3/25 = 12% filled). Colour matches current domain colour.

### Domain Transitions
When moving from one domain to the next (e.g., question 5 → 6), show a brief domain transition card:

```
┌──────────────────────────────┐
│                              │
│                              │
│    ✓ Spirituality Complete   │
│                              │
│    Next up:                  │
│                              │
│    🔴 Family & Friends       │
│    Relationships and         │
│    social connection         │
│                              │
│    [ Continue ]              │
│                              │
│                              │
└──────────────────────────────┘
```

This gives users a mental break and context for what's coming next.

### Answer Options
- 5 vertically stacked option cards
- Each card is a tappable rectangular button with rounded corners
- Unselected state: Light grey background, dark text
- Selected state: Domain-coloured background with white text, subtle scale-up animation
- Only one option can be selected at a time
- Tapping a different option deselects the previous one

### Navigation
- **Previous button**: Greyed out on question 1. Navigates back with a right-to-left slide animation. Previous answer should be pre-selected.
- **Next button**: Disabled (greyed out) until an answer is selected. Navigates forward with a left-to-right slide animation. On the final question (25/25), button text changes to "See My Score".
- Swiping left/right also navigates between questions (if current question has an answer selected)

### Animation
- Questions slide in from the right when advancing, from the left when going back
- Progress bar animates smoothly between fill levels
- Selected answer card scales up slightly (1.02x) with a subtle bounce
- Domain transition card fades in with a 0.3s ease

### Edge Cases
- User presses back on question 1: Return to Assessment Intro with a "Are you sure? Your progress will be lost." confirmation dialog
- User closes the app mid-assessment: Save progress locally so they can resume
- User tries to skip a question: "Next" button remains disabled — all questions must be answered

---

## Screen 7: Balance Score Result

### Purpose
The big reveal. Show the user their initial Balance Score and domain breakdown. This is the most emotionally impactful screen — it should feel rewarding, not judgmental.

### Layout
```
┌──────────────────────────────┐
│                              │
│   Your Life Balance          │
│                              │
│         ┌───────┐            │
│         │       │            │
│         │  5.8  │            │
│         │ ──────│            │
│         │  10   │            │
│         └───────┘            │
│     Your Balance Score       │
│                              │
│  ┌──────────────────────────┐│
│  │ 🟣 Spirituality     6.0 ││
│  │ ████████████░░░░░░░░░░░ ││
│  │                          ││
│  │ 🔴 Family & Friends 7.0 ││
│  │ ██████████████░░░░░░░░░ ││
│  │                          ││
│  │ 🟡 Work            5.5  ││
│  │ ███████████░░░░░░░░░░░░ ││
│  │                          ││
│  │ 🟢 Health           6.0 ││
│  │ ████████████░░░░░░░░░░░ ││
│  │                          ││
│  │ 🔵 Financial        4.5 ││
│  │ █████████░░░░░░░░░░░░░░ ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ ⭐ Strongest Area        ││
│  │ Family & Friends         ││
│  │                          ││
│  │ ⚡ Needs Attention       ││
│  │ Financial                ││
│  └──────────────────────────┘│
│                              │
│  Your journey starts here.   │
│  Small daily actions will    │
│  bring your life into        │
│  balance.                    │
│                              │
│  [ See My Balance Wheel ]    │
│                              │
└──────────────────────────────┘
```

### The Score Circle
- Large circular element at the top
- The score number (e.g., 5.8) is the largest text on the screen
- A circular progress ring surrounds the number, filled proportionally (5.8/10 = 58%)
- The ring colour is a gradient based on score value:
  - 0-3: Red gradient (needs serious attention)
  - 3-5: Orange gradient (below average)
  - 5-7: Yellow-green gradient (getting there)
  - 7-9: Green gradient (doing well)
  - 9-10: Gold gradient (exceptional)

### Domain Breakdown
- 5 horizontal progress bars, one per domain
- Each bar uses the domain's colour
- Score number displayed on the right side of each bar
- Bars are inside a card with subtle shadow

### Highlights Card
- "Strongest Area" with a star icon — shows the highest-scoring domain
- "Needs Attention" with a lightning bolt icon — shows the lowest-scoring domain
- If two domains tie for highest or lowest, show both

### Animation (This screen should feel celebratory)
- Score circle: Number counts up from 0.0 to the actual score over 1.5 seconds
- Circular progress ring fills simultaneously with the count-up
- Domain bars: Each bar fills from 0% to its score with a 0.2s stagger between domains
- Highlights card: Fades in after all bars finish animating
- Encouraging message fades in last
- Optional: Subtle confetti particles for scores above 7.0

### Interactions
- "See My Balance Wheel" navigates to the Balance Wheel screen
- Each domain bar is tappable — tapping shows a tooltip with the 5 question scores that produced this domain score
- Scrollable content (the screen is likely taller than the viewport)

### Tone
- Never use negative language regardless of score
- Low score (0-4): "Every journey starts somewhere. You've taken the first step."
- Medium score (4-6): "You're building awareness. That's the foundation of real change."
- High score (6-8): "You're doing well. Let's make it even better."
- Very high score (8-10): "Impressive balance. Let's keep the momentum going."

---

## Screen 8: Balance Wheel

### Purpose
Visual representation of life balance using a radar/spider chart. This is the screen the stakeholder called "very powerful" — it lets users instantly see which areas of life are strong and which are lagging.

### Layout
```
┌──────────────────────────────┐
│  ←     Balance Wheel         │
│                              │
│                              │
│          Spirituality        │
│            6.0               │
│             ╱╲               │
│            ╱  ╲              │
│  Financial╱    ╲Family       │
│   4.5    ╱  ██  ╲  7.0      │
│          ╲  ██  ╱            │
│           ╲    ╱             │
│    Health  ╲  ╱  Work        │
│     6.0     ╲╱    5.5       │
│                              │
│                              │
│  ┌──────────────────────────┐│
│  │ Balance Gap: 2.5         ││
│  │                          ││
│  │ Your highest domain is   ││
│  │ 2.5 points above your    ││
│  │ lowest. Closing this gap ││
│  │ means a more balanced    ││
│  │ life.                    ││
│  └──────────────────────────┘│
│                              │
│  [ Continue to Dashboard ]   │
│                              │
└──────────────────────────────┘
```

### The Radar Chart
- 5 axes extending from centre, evenly spaced at 72° apart
- Each axis represents one domain, labelled at the outer edge with domain name + score
- A filled polygon connects the user's scores across all 5 axes
- Fill colour: Semi-transparent gradient (light in centre, darker at edges)
- Background grid: 2-3 concentric pentagons showing score levels (e.g., at 2.5, 5.0, 7.5)
- Each domain label is displayed in its corresponding domain colour

### Balance Gap Analysis
- Card below the chart showing the numerical gap between highest and lowest domain
- Contextual message based on gap size:
  - Gap < 1.5: "Your life domains are well aligned. Great balance!"
  - Gap 1.5-3.0: "There's room to bring your lower areas up. Daily check-ins will help."
  - Gap > 3.0: "Some areas need more attention. Focus on your daily actions in those domains."

### Animation
- The radar chart draws itself from the centre outward over 1.2 seconds
- Each axis extends first, then the polygon fills between them
- Domain scores count up simultaneously
- The polygon has a subtle "breathing" animation (slight scale pulse) after initial draw

### Interactions
- Tapping any domain label on the chart highlights that axis and shows a tooltip with the 5 question scores
- Pinch to zoom on the chart for closer inspection
- "Continue to Dashboard" navigates to the main Dashboard (this is the last onboarding screen)

---

## Screen 9: Main Dashboard (Home Screen)

### Purpose
The central hub of the app. Users see this every time they open the app after onboarding. It shows their current Balance Score, domain summary, quick access to daily check-in, and any insights or streaks.

### Layout
```
┌──────────────────────────────┐
│  Good morning, Alex    [👤]  │
│                              │
│  ┌──────────────────────────┐│
│  │                          ││
│  │  Your Balance Score      ││
│  │                          ││
│  │       ┌───────┐          ││
│  │       │  6.3  │          ││
│  │       │ ───── │          ││
│  │       │  10   │          ││
│  │       └───────┘          ││
│  │                          ││
│  │   ▲ 0.5 from last week  ││
│  │                          ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │  🟣 Spirituality    6.5 ││
│  │  🔴 Family          7.0 ││
│  │  🟡 Work            5.8 ││
│  │  🟢 Health          7.1 ││
│  │  🔵 Financial       5.0 ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │  🔥 Daily Check-In      ││
│  │                          ││
│  │  12 day streak           ││
│  │                          ││
│  │  Take today's check-in   ││
│  │  to keep your streak     ││
│  │  alive!                  ││
│  │                          ││
│  │  [ Check In Now ]        ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │  💡 Insight              ││
│  │                          ││
│  │  Your Health score       ││
│  │  improved this week.     ││
│  │  Small actions add up.   ││
│  └──────────────────────────┘│
│                              │
│                              │
│  ┌────┬────┬────┬────┬────┐ │
│  │ 🏠 │ 📊 │    │ 🎯 │ 👤 │ │
│  │Home│Prog│    │Wheel│Prof│ │
│  └────┴────┴────┴────┴────┘ │
└──────────────────────────────┘
```

### Header
- Greeting that changes by time of day:
  - 5am-12pm: "Good morning, [Name]"
  - 12pm-5pm: "Good afternoon, [Name]"
  - 5pm-9pm: "Good evening, [Name]"
  - 9pm-5am: "Time to wind down, [Name]"
- Profile avatar/icon (tappable → navigates to Profile screen)

### Balance Score Card (Hero Card)
- Largest card on screen, prominent placement at top
- Circular score display with progress ring (same style as Result screen)
- Weekly trend indicator: Green up arrow with positive change, or red down arrow with negative change
- Tappable → navigates to detailed Progress screen

### Domain Summary Card
- Compact list of all 5 domains with their current scores
- Each domain row shows: colour dot, domain name, score
- Optional: Mini inline progress bar for each domain
- Each domain row is tappable → navigates to that domain's Detail screen

### Daily Check-In Card
- Changes appearance based on check-in status:
  - **Not yet checked in today**: Prominent card with fire emoji, streak count, and "Check In Now" button
  - **Already checked in today**: Greyed-out card with checkmark, "You've checked in today! See you tomorrow."
  - **Streak at risk** (late in the day, hasn't checked in): Pulsing border, urgent message: "Don't lose your 12-day streak! Check in now."
- "Check In Now" button navigates to Daily Check-In screen

### Insight Card
- Shows the most recent smart insight
- Changes daily/weekly based on score trends
- Tappable → navigates to Progress screen for more detail
- If no meaningful insight available, show a motivational quote

### Bottom Navigation Bar
- 5 tabs: Home (active), Progress, [centre empty or logo], Balance Wheel, Profile
- Active tab is highlighted with domain accent colour
- Switching tabs has a smooth cross-fade transition

### Pull-to-Refresh
- Pulling down refreshes all data from the backend
- Shows a subtle loading animation during refresh

### Edge Cases
- Brand new user (just finished assessment, no check-ins yet): Check-in card shows "Start your first check-in!" instead of streak count. No weekly trend shown on Balance Score. Insight card shows welcome message.
- User has checked in today: Check-in card shows completed state
- No internet: Show cached data with a subtle "Offline" banner at the top

---

## Screen 10: Daily Check-In

### Purpose
The most frequently used screen in the app. Users answer 5 simple questions (one per domain) to track their daily behaviours. Must be completable in 30-60 seconds.

### Layout — Single scrollable screen with all 5 questions
```
┌──────────────────────────────┐
│  ←     Daily Check-In        │
│                              │
│  How was your day?           │
│  March 19, 2026              │
│                              │
│  ┌──────────────────────────┐│
│  │ 🟣 Spirituality          ││
│  │                          ││
│  │ Did you do something     ││
│  │ today that connected     ││
│  │ you to your values or    ││
│  │ sense of purpose?        ││
│  │                          ││
│  │ [  No  ] [A little] [Yes]││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 🔴 Family & Friends      ││
│  │                          ││
│  │ Did you connect with     ││
│  │ family or friends today? ││
│  │                          ││
│  │ [  No  ] [A little] [Yes]││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 🟡 Work / Productivity   ││
│  │                          ││
│  │ Did you make meaningful  ││
│  │ progress in your work or ││
│  │ responsibilities today?  ││
│  │                          ││
│  │ [  No  ] [A little] [Yes]││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 🟢 Health                ││
│  │                          ││
│  │ Did you take care of     ││
│  │ your physical or mental  ││
│  │ health today?            ││
│  │                          ││
│  │ Examples: exercise,      ││
│  │ rest, stress management  ││
│  │                          ││
│  │ [  No  ] [A little] [Yes]││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 🔵 Financial             ││
│  │                          ││
│  │ Did you make a positive  ││
│  │ financial decision today?││
│  │                          ││
│  │ Examples: saving money,  ││
│  │ avoiding unnecessary     ││
│  │ spending, managing bills ││
│  │                          ││
│  │ [  No  ] [A little] [Yes]││
│  └──────────────────────────┘│
│                              │
│  [ Submit Check-In ]         │
│                              │
└──────────────────────────────┘
```

### Question Cards
- Each domain gets its own card with the domain colour as an accent (left border or header stripe)
- Domain name and icon at the top of each card
- Question text in clear, readable font
- Health and Financial cards include example text in lighter/smaller font to help users understand what counts
- Three answer buttons arranged horizontally: No | A little | Yes

### Answer Buttons
- Unselected: Outlined style, light background
- Selected states (different colour per answer):
  - **No**: Soft red/pink background (#FEE2E2)
  - **A little**: Soft amber background (#FEF3C7)
  - **Yes**: Soft green background (#D1FAE5)
- Only one answer per question can be selected
- Tapping a selected answer deselects it (toggle behaviour)

### Submit Button
- Disabled (greyed out) until all 5 questions have an answer
- When all answered, button becomes active with a green colour
- Shows total daily score as a preview: "Submit (8/10 points)"
- On tap: Shows brief loading state, then navigates to Daily Insight screen

### Animation
- Cards can stagger-fade-in when the screen loads (0.1s delay between each)
- Answer selection has a subtle scale bounce (1.05x → 1.0x)
- When all 5 questions are answered, the submit button animates in with a slide-up + fade
- Haptic feedback on answer selection (light tap)

### Edge Cases
- User already checked in today: Show a message "You've already checked in today! Come back tomorrow." with a button to return to Dashboard
- User presses back without submitting: Show confirmation "Your answers haven't been saved. Leave anyway?"
- User submits with all "No" answers: Still submit normally — no judgment. Insight screen adjusts its tone accordingly.

---

## Screen 11: Daily Insight (Post Check-In)

### Purpose
Immediate feedback after submitting a check-in. Reinforce the habit, show streak progress, and provide a personalised insight.

### Layout
```
┌──────────────────────────────┐
│                              │
│                              │
│         ✓                    │
│                              │
│   Great job checking in!     │
│                              │
│                              │
│   ┌──────────────────────────┐
│   │ Today's Score    8 / 10 ││
│   │                          ││
│   │ 🟣 Spirituality      2  ││
│   │ 🔴 Family            2  ││
│   │ 🟡 Work              1  ││
│   │ 🟢 Health             2  ││
│   │ 🔵 Financial          1  ││
│   └──────────────────────────┘│
│                              │
│   ┌──────────────────────────┐
│   │  🔥 Check-In Streak     ││
│   │                          ││
│   │       13 Days            ││
│   │                          ││
│   │  M  T  W  T  F  S  S    ││
│   │  ✓  ✓  ✓  ✓  ✓  ✓  ●   ││
│   └──────────────────────────┘│
│                              │
│   ┌──────────────────────────┐
│   │  💡 Insight              ││
│   │                          ││
│   │  Your Health score has   ││
│   │  been improving all      ││
│   │  week. Keep up the       ││
│   │  exercise and rest!      ││
│   └──────────────────────────┘│
│                              │
│   [ Back to Dashboard ]      │
│                              │
└──────────────────────────────┘
```

### Confirmation Header
- Large animated checkmark (draws itself like a signature)
- Message varies by score:
  - 0-3 points: "Thanks for checking in. Tomorrow is a new day."
  - 4-6 points: "Solid effort today! Keep building those habits."
  - 7-8 points: "Great job checking in!"
  - 9-10 points: "Amazing day! You're crushing it!"

### Today's Score Card
- Total daily score out of 10
- Individual domain scores (0, 1, or 2 each)
- Each domain row uses domain colour

### Streak Card
- Large streak number with fire emoji
- Weekly calendar row showing check-in status for the current week:
  - ✓ = checked in
  - ✗ = missed
  - ● = today (just completed)
  - ○ = future days
- Streak milestones with mini celebrations:
  - 7 days: "1 Week streak! 🎉"
  - 30 days: "1 Month streak! 🏆"
  - 100 days: "100 Days! You're unstoppable! 💪"

### Insight Card
- Personalised message based on recent trends
- Template-based examples:
  - Domain improving: "Your {domain} score has been rising. {specific encouragement}."
  - Domain declining: "Your {domain} could use some love. Try {suggestion} tomorrow."
  - Consistent scorer: "You've been steady in {domain} all week. Consistency is key."
  - First check-in: "Welcome to your first check-in! Come back tomorrow to start building your streak."

### Animation
- Checkmark draws itself over 0.5 seconds
- Score card values count up from 0
- Streak number has a subtle bounce animation
- If it's a milestone streak, show a brief confetti burst
- Entire screen has a celebratory upward momentum feel

### Interactions
- "Back to Dashboard" returns to the Dashboard with the check-in card now showing completed state
- Screen auto-navigates to Dashboard after 10 seconds if user doesn't interact (with a countdown indicator)

---

## Screen 12: Progress Screen

### Purpose
Show the user how their Balance Score and individual domain scores have changed over time. This is where motivation lives — seeing an upward trend is powerful.

### Layout
```
┌──────────────────────────────┐
│         Progress             │
│                              │
│  [  Week  ] [ Month ] [ All ]│
│                              │
│  ┌──────────────────────────┐│
│  │ Balance Score Over Time  ││
│  │                          ││
│  │  7┤         ╱──          ││
│  │  6┤    ╱───╱             ││
│  │  5┤───╱                  ││
│  │  4┤                      ││
│  │   └─┬──┬──┬──┬──┬──┬──  ││
│  │    W1  W2  W3  W4        ││
│  │                          ││
│  │  Current: 6.7            ││
│  │  Started: 5.8            ││
│  │  Change:  +0.9 ▲         ││
│  └──────────────────────────┘│
│                              │
│  Domain Progress             │
│                              │
│  ┌──────────────────────────┐│
│  │ 🟣 Spirituality          ││
│  │ 6.0 → 6.5  (+0.5) ▲     ││
│  │ ██████████████████░░░░░  ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 🔴 Family & Friends      ││
│  │ 7.0 → 7.5  (+0.5) ▲     ││
│  │ ██████████████████████░  ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 🟡 Work                  ││
│  │ 5.5 → 5.8  (+0.3) ▲     ││
│  │ ██████████████░░░░░░░░░  ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 🟢 Health                ││
│  │ 6.0 → 7.1  (+1.1) ▲     ││
│  │ ████████████████████░░░  ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 🔵 Financial             ││
│  │ 4.5 → 5.0  (+0.5) ▲     ││
│  │ █████████████░░░░░░░░░░  ││
│  └──────────────────────────┘│
│                              │
│  ┌────┬────┬────┬────┬────┐ │
│  │ 🏠 │ 📊 │    │ 🎯 │ 👤 │ │
│  └────┴────┴────┴────┴────┘ │
└──────────────────────────────┘
```

### Time Range Selector
- Three toggle buttons: Week / Month / All
- Segmented control style (one always selected)
- Changing selection re-renders the chart with the appropriate time range
- Week: Last 7 days (daily data points)
- Month: Last 30 days (weekly averages)
- All: Since account creation (weekly averages)

### Balance Score Chart
- Line chart with smooth curves (not jagged lines)
- X-axis: Time periods
- Y-axis: Score 0-10
- Data points have dots on the line
- Area below the line has a subtle gradient fill
- Tapping a data point shows a tooltip with the exact score and date
- Summary below chart: Current score, starting score, total change

### Domain Progress Cards
- One card per domain
- Shows: Starting score → Current score, change amount, direction arrow
- Progress bar showing current score out of 10
- Green up arrow for improvement, red down arrow for decline, grey dash for no change
- Each card is tappable → navigates to Domain Detail screen

### Animation
- Chart line draws itself from left to right over 1 second
- Domain cards stagger-fade-in (0.1s delay between each)
- Score changes count up/down to their values

### Edge Cases
- New user with only 1 day of data: Show single data point on chart, message "Check in daily to see your progress over time"
- All domains unchanged: Show "Steady as she goes. Consistency matters too."
- User hasn't checked in for several days: Show gap in chart line, message "We missed you! Get back on track with a check-in today."

---

## Screen 13: Domain Detail

### Purpose
Deep dive into a single domain. Show historical scores, recent daily check-in answers, and personalised suggestions for improvement.

### Layout (Example: Financial Domain)
```
┌──────────────────────────────┐
│  ←     Financial             │
│                              │
│  ┌──────────────────────────┐│
│  │                          ││
│  │  Current Score           ││
│  │                          ││
│  │     5.0 / 10             ││
│  │                          ││
│  │  ▲ +0.5 from last week  ││
│  │                          ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ Score Trend              ││
│  │                          ││
│  │  6┤                      ││
│  │  5┤     ╱──╱──           ││
│  │  4┤────╱                 ││
│  │  3┤                      ││
│  │   └─┬──┬──┬──┬──┬──     ││
│  │    Mon Tue Wed Thu Fri   ││
│  └──────────────────────────┘│
│                              │
│  Recent Check-Ins            │
│                              │
│  ┌──────────────────────────┐│
│  │ Today       Yes     ✓✓  ││
│  │ Yesterday   A little ✓  ││
│  │ Monday      No          ││
│  │ Sunday      Yes     ✓✓  ││
│  │ Saturday    A little ✓  ││
│  │ Friday      Yes     ✓✓  ││
│  │ Thursday    Yes     ✓✓  ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 💡 Suggestion            ││
│  │                          ││
│  │ Try setting a small      ││
│  │ daily saving goal.       ││
│  │ Even $5 a day builds     ││
│  │ financial confidence     ││
│  │ over time.               ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ 📋 Your Assessment       ││
│  │    Answers               ││
│  │                          ││
│  │ Financial security  5.0  ││
│  │ Expense management  7.5  ││
│  │ Future stability    5.0  ││
│  │ Financial stress    2.5  ││
│  │ Saving ability      5.0  ││
│  └──────────────────────────┘│
│                              │
│  ┌────┬────┬────┬────┬────┐ │
│  │ 🏠 │ 📊 │    │ 🎯 │ 👤 │ │
│  └────┴────┴────┴────┴────┘ │
└──────────────────────────────┘
```

### Score Header
- Large domain score with the domain's colour
- Weekly change indicator (up/down arrow with number)
- Background tinted with a very subtle version of the domain colour

### Score Trend Chart
- Mini line chart showing the domain score over the selected time period
- Same interaction as the Progress screen chart (tappable data points)
- Uses the domain's colour for the line and fill

### Recent Check-Ins
- List of the last 7 days of check-in answers for this domain
- Each row shows: Day name, answer (No / A little / Yes), and point dots (0, 1, or 2 dots)
- Missed days show as "—" with grey text
- Answers colour-coded: No = red text, A little = amber text, Yes = green text

### Suggestion Card
- Domain-specific actionable advice
- Changes based on score trends:
  - Score declining: More urgent, specific suggestions
  - Score steady: Maintenance tips
  - Score improving: Encouragement + next-level challenges
- Examples per domain:
  - Spirituality: "Take 5 minutes tomorrow to sit quietly and reflect on what matters most to you."
  - Family: "Send a quick message to someone you haven't spoken to in a while."
  - Work: "Pick your single most important task for tomorrow before you finish today."
  - Health: "Try a 10-minute walk after lunch tomorrow."
  - Financial: "Review one subscription today — is it still worth it?"

### Original Assessment Answers
- Expandable/collapsible section
- Shows the 5 original assessment questions and the user's initial answers
- Helps users compare their starting perception with current daily behaviour

### Interactions
- Back arrow (←) returns to Progress screen or Dashboard (depending on where user came from)
- Chart is interactive (tap data points for tooltips)
- Suggestion card has a "Got it" dismiss button that marks it as read

---

## Screen 14: Profile & Settings

### Purpose
Account management, app preferences, and data controls.

### Layout
```
┌──────────────────────────────┐
│         Profile              │
│                              │
│         ┌────┐               │
│         │ AV │               │
│         └────┘               │
│        Alex Nguyen           │
│     alex@email.com           │
│     [ Edit Profile ]         │
│                              │
│  ─────────────────────────── │
│                              │
│  Balance Summary             │
│  ┌──────────────────────────┐│
│  │ Member since  Mar 2026   ││
│  │ Check-ins     47         ││
│  │ Best streak   23 days    ││
│  │ Current score 6.3        ││
│  └──────────────────────────┘│
│                              │
│  ─────────────────────────── │
│                              │
│  Preferences                 │
│                              │
│  Notifications               │
│  Daily check-in reminder  🔔│
│  ┌──────────────────────────┐│
│  │ Reminder time   8:00 PM  ││
│  │ [toggle: ON]             ││
│  └──────────────────────────┘│
│                              │
│  Weekly summary email     🔔│
│  ┌──────────────────────────┐│
│  │ [toggle: ON]             ││
│  └──────────────────────────┘│
│                              │
│  ─────────────────────────── │
│                              │
│  Data & Privacy              │
│                              │
│  [ Retake Assessment ]       │
│  [ Export My Data ]          │
│  [ Privacy Policy ]          │
│  [ Delete Account ]          │
│                              │
│  ─────────────────────────── │
│                              │
│  [ Log Out ]                 │
│                              │
│  App Version 1.0.0           │
│                              │
│  ┌────┬────┬────┬────┬────┐ │
│  │ 🏠 │ 📊 │    │ 🎯 │ 👤 │ │
│  └────┴────┴────┴────┴────┘ │
└──────────────────────────────┘
```

### Profile Section
- User avatar (initials-based if no photo uploaded, or upload option)
- Name and email display
- "Edit Profile" opens a form to update name and email

### Balance Summary
- Lifetime stats card: Member since date, total check-ins completed, best streak achieved, current Balance Score
- This gives users a sense of accomplishment and investment in the app

### Notifications
- Daily check-in reminder toggle (on/off)
- Reminder time picker (user can choose when they want the daily notification)
- Weekly summary email toggle

### Data & Privacy
- **Retake Assessment**: Allows users to redo the 25-question assessment. Shows confirmation dialog: "This will reset your baseline scores. Your check-in history will be preserved. Continue?"
- **Export My Data**: Downloads a JSON or CSV file with all user data (assessment answers, check-in history, scores)
- **Privacy Policy**: Opens a scrollable modal or navigates to a privacy policy page
- **Delete Account**: Red text. Opens a serious confirmation dialog: "This will permanently delete your account and all your data. This cannot be undone." Requires typing "DELETE" to confirm.

### Log Out
- Prominent button but not destructive-styled
- Confirmation dialog: "Are you sure you want to log out?"
- On logout: Clear local state, navigate to Welcome Screen

### Edge Cases
- User changes notification time: Update the scheduled notification immediately
- User retakes assessment: Navigate to Assessment Questions, on completion update baseline scores
- User exports data with no check-ins: Export file still includes assessment data and account info
- Delete account: Must remove all data from database, clear local storage, navigate to Welcome Screen

---

## Screen 15: Forgot Password

### Purpose
Allow users to reset their password via email.

### Layout
```
┌──────────────────────────────┐
│  ←                           │
│                              │
│   Reset Password             │
│                              │
│   Enter your email and we'll │
│   send you a link to reset   │
│   your password.             │
│                              │
│   ┌────────────────────────┐ │
│   │ Email Address          │ │
│   └────────────────────────┘ │
│                              │
│   [ Send Reset Link ]        │
│                              │
└──────────────────────────────┘
```

### After Submission
```
┌──────────────────────────────┐
│                              │
│         ✉️                    │
│                              │
│   Check Your Email           │
│                              │
│   We've sent a password      │
│   reset link to              │
│   alex@email.com             │
│                              │
│   Didn't receive it?         │
│   [ Resend Email ]           │
│                              │
│   [ Back to Login ]          │
│                              │
└──────────────────────────────┘
```

### Interactions
- "Resend Email" is rate-limited — disabled for 60 seconds after each send, with a countdown timer
- "Back to Login" navigates to Login screen
- If email doesn't exist in the system: Still show the "Check Your Email" screen (security best practice — don't reveal which emails are registered)

---

## Navigation Architecture

### Tab Bar (Bottom Navigation)
```
┌────────┬──────────┬─────────┬──────────┬─────────┐
│  Home  │ Progress │ (empty) │  Wheel   │ Profile │
│   🏠   │    📊    │         │    🎯    │   👤    │
└────────┴──────────┴─────────┴──────────┴─────────┘
```

- Home → Dashboard
- Progress → Progress Screen
- Centre space → Reserved for future feature or left as spacing
- Wheel → Balance Wheel
- Profile → Profile & Settings

### Stack Navigation (Within Tabs)
- Home tab: Dashboard → Daily Check-In → Daily Insight → (back to Dashboard)
- Progress tab: Progress Screen → Domain Detail → (back to Progress)
- Wheel tab: Balance Wheel (standalone)
- Profile tab: Profile & Settings → Edit Profile / Privacy Policy / (back to Profile)

### Auth Flow (Outside Tab Navigation)
- Splash → Welcome (carousel) → Create Account / Login → Assessment Intro → Assessment Questions → Score Result → Balance Wheel → Dashboard (enters tab navigation)

### Screen Transition Animations
- Stack push (forward): Slide from right
- Stack pop (back): Slide from left
- Tab switch: Cross-fade (no slide)
- Modal (confirmations, tooltips): Slide up from bottom with backdrop fade
- Auth → Main app: Fade transition (feels like entering a new space)
