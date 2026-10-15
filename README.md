<div align="center">
  <img src="pulse/assets/icon.png" alt="Pulse app icon" width="120" />
  <h1>Pulse</h1>
  <p><strong>Build a more balanced life, one small action at a time.</strong></p>
  <p>A cross-platform wellbeing app for understanding and improving balance across five connected areas of life.</p>
</div>

## About Pulse

Pulse turns the Balanced Life model into a practical mobile experience. An entry check-in establishes a baseline across five domains - Spirituality, Family & Friends, Health & Fitness, Finance, and Productivity - and the app then helps users build sustainable routines through daily missions, personal trackers, progress insights, and optional social encouragement.

The project was developed for ANU TechLauncher / COMP8715 by a five-person student team. It runs on iOS, Android, and web from one Expo and React Native codebase, with Firebase providing authentication, data storage, real-time updates, and media storage.

> Pulse is a wellbeing and self-reflection tool. It is not a medical, psychological, or financial advice service.

## Features

- **Balanced Life dashboard** - view five domain scores, Life Strength, Evenness, and an overall Balanced Life Score.
- **Entry quiz** - create a starting baseline with one self-rating for each life domain.
- **Daily missions** - receive three achievable actions each day, with lower-scoring domains prioritised when appropriate.
- **Mood and journal** - record a daily mood, emotion tags, and an optional private reflection.
- **Physical activity** - log cardio and strength sessions, reuse favourite workouts as templates, and review activity history.
- **Budget tracker** - configure accounts and category limits, log expenses, and review charts, category progress, and a daily spending calendar.
- **Saving plans** - create goals, record savings, track milestones, and direct unused daily budget toward an active plan.
- **To-do list** - organise tasks by due date and priority, with completion contributing to the Productivity domain.
- **Social feed and messaging** - connect with friends, share check-ins or achievement cards, react and comment, and send direct messages.
- **Progress analytics** - explore overall and domain trends across 4-, 8-, and 12-week ranges.
- **Guided tutorials** - get contextual first-use help and replay walkthroughs from the Profile area.

## How scoring works

Each domain begins with an entry-quiz score from 20 to 100. During a Monday-to-Sunday week, Pulse combines three types of evidence:

| Component | Weight | Calculation |
| --- | ---: | --- |
| Reflection | 30% | Average 1-5 rating, converted to a 0-100 scale |
| Action | 40% | Earned action points divided by the domain's weekly target, capped at 100 |
| Consistency | 30% | Active days divided by seven, capped at 100 |

The observed result is converted into a gradual weekly adjustment between -2 and +2, then applied to the frozen week-start score. Weeks with no actions keep the previous score unchanged.

The overall score rewards both strength and balance:

```text
Life Strength       = average of the five domain scores
Evenness            = 100 - (2 x standard deviation), clamped to 0-100
Balanced Life Score = 50% Life Strength + 50% Evenness
```

## Technology

| Area | Technology |
| --- | --- |
| App | JavaScript, React 19, React Native 0.83, Expo SDK 55 |
| Backend | Firebase Authentication, Cloud Firestore, Cloud Storage |
| Device storage | AsyncStorage, Expo SecureStore |
| UI and media | Expo Image Picker, Manrope, Expo Vector Icons, React Native SVG |
| Testing | Jest, jest-expo, React Native Testing Library |

The codebase separates React Native pages and components from Firebase service modules and pure domain logic. The scoring and mission engines have no UI or network dependency, which keeps their rules deterministic and testable.

## Getting started

### Prerequisites

- [Node.js LTS](https://nodejs.org/)
- npm (included with Node.js)
- A Firebase project with Email/Password Authentication, Cloud Firestore, and Cloud Storage enabled
- One of the following:
  - [Expo Go](https://expo.dev/go) on a physical iOS or Android device
  - [Android Studio](https://developer.android.com/studio) and an Android Virtual Device
  - Xcode and the iOS Simulator on macOS

### 1. Clone the repository

```bash
git clone https://github.com/CARMEN-D5/Pulse.git
cd Pulse/pulse
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create `pulse/.env.local` and copy the web-app configuration values from Firebase Console:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Do not commit `.env.local`. Firebase client configuration is not a server-side secret, but access must still be protected by correctly deployed Firestore and Storage rules.

### 4. Start the app

```bash
npm start
```

Scan the QR code with Expo Go, or use one of the platform commands below.

| Command | Purpose |
| --- | --- |
| `npm run android` | Start Expo and open Android |
| `npm run ios` | Start Expo and open iOS (macOS required) |
| `npm run web` | Start the web version |
| `npm run build:web` | Export a production web build |
| `npm run prebuild` | Generate native iOS and Android projects |

### Network note

The current Firebase setup uses forced long polling and an in-memory Firestore cache. A live network connection is required, and some managed university networks may block Firebase traffic. If authentication or data loading stalls, retry on a home network or mobile hotspot.

## Testing

Run the Jest suite from the `pulse` application directory:

```bash
npm test -- --runInBand
```

The latest local verification on `main` completed with **16 of 17 suites passing** and **346 of 364 tests passing**. The remaining failures are in `src/missions/DailyMission.test.js`: its test renderer does not yet provide the `SharePromptProvider` now required by the Daily Missions screen. The scoring engine, scoring simulations, mission engine, Firebase scoring service, sharing, tutorials, saving milestones, shell, and app tests passed in that run.

The handover QA report also records manual testing across Android and iOS, 21 formal peer reviews, and more than 40 user-test cases. See the project documentation for the original test programme and historical results.

## Project structure

```text
Pulse/
├── Documentation/          Project, architecture, testing, and handover PDFs
├── pulse/                  Expo application
│   ├── assets/             Icons and launch assets
│   ├── documents/          In-app privacy and consent content
│   ├── src/
│   │   ├── components/     Shared UI, tutorials, and sharing components
│   │   ├── firestore/      Firebase data-access services
│   │   ├── missions/       Daily mission engine and history
│   │   ├── pages/          Feature screens
│   │   ├── scoring/        Pure scoring engine and simulations
│   │   ├── tutorial/       Tutorial definitions and state
│   │   └── App.js          Application composition and navigation state
│   ├── app.json            Expo application configuration
│   ├── firestore.rules     Firestore security rules
│   ├── storage.rules       Cloud Storage security rules
│   └── package.json        Dependencies and scripts
└── README.md
```

## Documentation

- [Introduction](Documentation/Introduction.pdf)
- [Technical Architecture and Scoring System](Documentation/Technical%20Architecture%20and%20Scoring%20System.pdf)
- [Testing and Quality Assurance Report](Documentation/Testing%20and%20Quality%20Assurance%20Report.pdf)
- [User Stories, Personas & Scenarios](Documentation/User%20Stories%2C%20Personas%20%26%20Scenarios.pdf)
- [User Flow Charts](Documentation/userFlowChart.pdf)
- [Demo Script, Known Issues & Future Improvements](Documentation/Demo%20Script%2C%20Known%20Issues%20%26%20Future%20Improvements.pdf)

## Release considerations

Before a public release:

- Re-run the full automated and device test suites.
- Audit Firestore and Storage rules against every current collection and media path.
- Review the visibility of fields stored in root user-profile documents.
- Publish a privacy policy and support contact.
- Remove or gate development-only data generators.
- Review Android permissions and retain only those required by implemented features.
- Validate cloud-build environment variables and test the release build on physical devices.
- Complete a trademark and asset-rights review for the Pulse name and icon.

## Contributing

1. Create a branch from the latest `main`.
2. Keep Firebase access in the service layer and deterministic rules in pure modules.
3. Add or update tests for behaviour changes.
4. Run `npm test -- --runInBand` and exercise the affected flow on a device or emulator.
5. Open a pull request with the change, test evidence, and any Firebase rule or configuration impact.

Never commit local environment files, service-account credentials, private keys, or real user data.

## Team

Pulse was developed by:

- Anthea Cai Soltes
- Matthew Bialocerkowski
- Sajeevan Anandakumar
- Viet An Pham
- Yuting Mao

Built as part of ANU TechLauncher / COMP8715 Software Engineering Project, 2026.

## License

No open-source license has been added to this repository. Contact the project maintainers before copying, modifying, or redistributing the code or assets.
