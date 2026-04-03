# VELORA

VELORA is a cross-platform mobile application for helping users understand and improve balance across five life domains:

- Spirituality
- Family and Friends
- Work/Productivity
- Health
- Financial Wellbeing

This repository is now organized around a mobile-first, Supabase-first architecture.

Backend direction note:
- `Supabase` is the active backend source of truth for Version 1
- Firebase scaffold files currently remain in the repo only as legacy reference during cleanup

## Repository layout

```text
Documentation/  Product, scoring, and architecture decisions
mobile/         Expo + React Native + TypeScript app
functions/      Legacy Firebase Functions scaffold kept temporarily
shared/         Shared TypeScript domain and scoring utilities
supabase/       Supabase local project scaffold, migrations, and scheduler setup
pulse/          Legacy Create React App scaffold kept for reference only
```

## Key documents

- [Scoring decisions](./Documentation/scoring-architecture-decisions.md)
- [Technical blueprint](./Documentation/mvp-technical-blueprint.md)
- [Supabase sequencing](./Documentation/supabase-sequencing.md)
- [V1 release checklist](./Documentation/v1-release-checklist.md)

## Phase 0 status

Current V1 implementation highlights:

- Supabase schema, RLS, RPCs, normalization triggers, and weekly summary scheduler are in place
- Expo mobile app now has auth, onboarding, dashboard, check-in, summary, settings, and action-module foundations
- shared TypeScript score utilities mirror the backend formulas

## Install

From the repository root:

```bash
npm install
```

## Mobile environment setup

Create a local Expo environment file from the example in [mobile/.env.example](/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/mobile/.env.example).

For local Supabase development:
- `EXPO_PUBLIC_SUPABASE_URL` should usually be `http://127.0.0.1:54321`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` should be copied from the output of `npm run supabase:start`

## Useful commands

```bash
npm run dev:mobile
npm run typecheck:v1
npm run qa:v1:local
npm run build:shared
npm run build:functions
npm run typecheck:mobile
npm run typecheck:functions
npm run typecheck:shared
npm run supabase:start
npm run supabase:db:push:local
```

## Notes

- The mobile app foundation lives in `mobile/`, not `pulse/`.
- Official score generation is backend-authoritative.
- The active backend is Supabase.
- `shared/` is intended for scoring formulas, domain constants, and date utilities used by both mobile and backend code.
- Firebase commands are now legacy-only and are not part of the active V1 workflow.
