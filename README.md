# VELORA

VELORA is a cross-platform mobile application for helping users understand and improve balance across five life domains:

- Spirituality
- Family and Friends
- Work/Productivity
- Health
- Financial Wellbeing

This repository is now organized around a mobile-first Firebase architecture.

Backend direction note:
- the current intended backend direction is shifting toward `Supabase` because VELORA prioritizes scoring quality, analytics, and long-term advice generation
- Firebase scaffold files currently remain in the repo as temporary reference only during the pivot

## Repository layout

```text
Documentation/  Product, scoring, and architecture decisions
mobile/         Expo + React Native + TypeScript app
functions/      Temporary Firebase Functions scaffold kept during pivot
shared/         Shared TypeScript domain and scoring utilities
supabase/       Supabase local project scaffold
pulse/          Legacy Create React App scaffold kept for reference only
```

## Key documents

- [Scoring decisions](./Documentation/scoring-architecture-decisions.md)
- [Technical blueprint](./Documentation/mvp-technical-blueprint.md)
- [Supabase sequencing](./Documentation/supabase-sequencing.md)

## Phase 0 status

Phase 0 scaffolding is in place:

- root npm workspace config
- Expo mobile workspace scaffold
- Firebase config and rules placeholders kept temporarily
- Firebase Functions TypeScript scaffold kept temporarily
- Supabase CLI project scaffold
- shared TypeScript package scaffold

## Install

From the repository root:

```bash
npm install
```

## Useful commands

```bash
npm run dev:mobile
npm run build:shared
npm run build:functions
npm run typecheck:mobile
npm run typecheck:functions
npm run typecheck:shared
npm run firebase:emulators
```

## Notes

- The mobile app foundation lives in `mobile/`, not `pulse/`.
- Official score generation is backend-authoritative.
- The current backend pivot target is Supabase.
- `shared/` is intended for scoring formulas, domain constants, and date utilities used by both mobile and backend code.
