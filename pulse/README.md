# PULSE — Balanced Life (BLNC)

A lifestyle management mobile app that helps users improve their wellbeing across 5 life domains through personalised Balance Scores and daily micro actions.

## Tech Stack

- **Frontend**: React Native (Expo SDK 55) with TypeScript
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: Zustand + TanStack React Query
- **Navigation**: React Navigation 7

## Getting Started

```bash
cd balanced-life
npm install
npx expo start --web
```

## Project Structure

```
PULSE/
├── balanced-life/          # Main app (Expo/React Native)
│   ├── src/
│   │   ├── config/         # Theme, domains, scoring, Firebase
│   │   ├── features/       # Feature modules (assessment, auth, scoring, etc.)
│   │   ├── navigation/     # Auth, Onboarding, Main tab navigators
│   │   ├── screens/        # Screen components
│   │   ├── shared/         # Reusable components, types, utils
│   │   └── providers/      # Auth & Query providers
│   └── assets/             # App icons and images
├── pulse/                  # Documentation
├── BLNC_Product_Backlog.xlsx
└── *.md / *.docx / *.pdf   # Project docs
```

## 5 Life Domains

1. **Spirituality** — Purpose, meaning, inner peace
2. **Social Connection** — Relationships, family, community
3. **Productivity** — Work, study, goals
4. **Physical Health** — Exercise, sleep, nutrition
5. **Financial** — Budget, spending, financial security
