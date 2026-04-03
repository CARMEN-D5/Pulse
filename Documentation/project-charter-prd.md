# VELORA Project Charter and Product Requirements Document

Last updated: 2026-04-03

## 1. Document Purpose

This document combines the project charter and PRD for VELORA. It defines the product vision, business and user goals, target users, MVP scope, success measures, and delivery boundaries for Version 1.

Reference documents:
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/Scenarios&UserStory.md`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/scoring-architecture-decisions.md`
- `/Users/phamvietan/Desktop/Sem1_2026/COMP8715/VELORA/Documentation/supabase-sequencing.md`

## 2. Project Charter

### 2.1 Project Name

VELORA

### 2.2 Project Vision

VELORA helps people understand whether their life is balanced across five core domains and gives them simple, consistent tools to improve that balance over time.

### 2.3 Problem Statement

Many people feel that life is “off balance,” but they do not have a practical system for identifying which areas need attention or for tracking whether their efforts are leading to change. Existing tools often focus on only one area such as mood, fitness, or budgeting. VELORA addresses this by combining reflection, actions, and consistency into a unified cross-domain balance model.

### 2.4 Project Objective

Build a cross-platform mobile application that:
- measures user balance across five fixed life domains
- helps users log meaningful actions and daily reflections
- computes weekly domain and life-level summaries
- provides clear visibility into strengths, weak points, and trends
- establishes a strong analytics-ready backend for future advice and AI features

### 2.5 Primary Deliverables

- Cross-platform mobile app built with React Native and Expo
- Supabase-backed scoring and summary engine
- Weekly domain and life-level score computation
- MVP action logging tools across all five domains
- Product, UX, and architecture documentation

### 2.6 Stakeholder Context

This document assumes a student-project environment with a product team responsible for:
- product and UX definition
- mobile implementation
- backend and scoring logic
- evaluation of user value and system correctness

## 3. Product Overview

### 3.1 Product Vision Statement

VELORA becomes a personal life-balance companion that turns self-reflection and small actions into visible progress, while preserving trust through clear scoring rules and privacy-aware design.

### 3.2 Core Product Promise

The app should answer three questions for the user:
- Where is my life currently strongest and weakest?
- What actions am I actually taking to improve it?
- Am I becoming more balanced over time?

### 3.3 Core Product Principles

- Balance is the central product concept.
- Scores must be explainable and trustworthy.
- The backend is authoritative for official weekly scores.
- The app should be simple to use daily and meaningful to review weekly.
- Private content must be handled carefully and not overused for analytics.

## 4. Target Audience

### 4.1 Primary User Segments

1. Young adults in transition
- university students
- people living away from home for the first time
- users trying to build structure and routine

2. Caregivers and overwhelmed adults
- first-time parents
- users who feel one life area has taken over the rest
- users looking to reclaim neglected areas such as friends, health, or career

3. Working professionals with burnout or stagnation
- users with financial or career stability but low life fulfillment
- users who want to identify missing dimensions in life
- users seeking practical prompts and evidence of change

### 4.2 Secondary Audience

- general adults interested in wellbeing tracking
- users who prefer guided self-improvement over open-ended journaling alone

### 4.3 User Pain Points

- difficulty identifying which life area is most neglected
- lack of a single view across emotional, social, physical, financial, and productive life
- poor follow-through on healthy routines
- too many standalone apps with disconnected metrics
- little visibility into whether habits are improving overall life balance

## 5. Value Proposition

VELORA provides:
- a five-domain balance system instead of single-purpose tracking
- a weekly score model based on reflection, action, and consistency
- practical daily inputs and weekly insights
- a foundation for future personalized advice without sacrificing score transparency

## 6. Product Goals

### 6.1 Primary Goals

- help users discover which life domains need attention
- make self-improvement visible through weekly score movement
- encourage steady engagement through low-friction daily check-ins and action logging
- establish a robust, analytics-friendly backend model for future advice systems

### 6.2 Version 1 Goals

- launch a working mobile MVP for iOS and Android
- support all five domains with at least one score-relevant action type each
- generate official weekly domain summaries and one life-level weekly summary
- provide dashboard, history, and weekly insight views

### 6.3 Non-Goals for Version 1

- social/community network features
- photo galleries for hobbies
- calorie and diet tracking
- AI advice generation in production
- advanced recommendation engines
- wearable integrations

These remain planned for post-V1 iterations.

## 7. MVP Scope

### 7.1 In Scope

- account sign-up and sign-in
- onboarding baseline quiz across five domains
- fixed scoring timezone setup
- daily check-ins
- dashboard with overall balance and domain-level scores
- journal logging
- meaningful connection logging
- task completion logging
- focus session logging
- activity logging
- sleep logging
- expense logging
- budget review or savings action logging
- weekly summaries and history
- missions and streaks
- profile and settings

### 7.2 Out of Scope for MVP

- friend comparisons
- chat or social feed
- image uploads
- AI-generated coaching
- complex budgeting analytics
- calendar integrations
- push-heavy behavior automation beyond basic reminders

## 8. Core Functional Outcomes

To be considered successful, VELORA V1 must let a user:
- create an account
- complete onboarding once
- submit daily check-ins
- log score-relevant actions across all five domains
- receive official weekly domain and life summaries
- understand strongest and weakest life domains from the UI

## 9. Key Performance Indicators

### 9.1 Product KPIs

- Onboarding completion rate: target `>= 70%`
- Day-7 retention: target `>= 35%`
- Weekly active users / monthly active users: target `>= 50%`
- Daily check-in completion among weekly active users: target `>= 45%`
- Users receiving at least one official weekly summary within the first 14 days: target `>= 60%`
- Weekly summary open rate among eligible users: target `>= 65%`

### 9.2 Behavior and Value KPIs

- Percentage of retained users who log actions in at least 3 domains over 4 weeks
- Percentage of retained users with upward movement in at least one weak domain over 4 weeks
- Mission completion rate
- Self-reported usefulness score from in-app survey or project evaluation

### 9.3 Engineering and Quality KPIs

- Official weekly summary generation success rate: target `>= 99%`
- Duplicate score-event prevention for normalized action events
- No client ability to write authoritative score summaries directly
- No cross-user data access under authenticated conditions

## 10. Success Criteria

VELORA Version 1 is successful if:
- users can understand and trust the score system
- the app works consistently on iOS and Android
- weekly summaries are generated reliably
- the backend data model supports future analytics and advice features without needing a full redesign

## 11. Assumptions

- users are willing to provide short daily reflections
- users value a cross-domain balance model more than single-topic tracking
- weekly summaries are frequent enough to feel useful without becoming noisy
- privacy-sensitive content can be stored if its use is clearly bounded

## 12. Constraints

- Version 1 must remain focused and not expand into too many side features
- scoring must remain explainable and auditable
- the mobile app must remain offline-tolerant, not full offline-first
- backend design should favor long-term analytics and data integrity

## 13. Risks

- users may find scoring opaque if the app does not clearly explain the weekly result
- engagement may drop if daily check-ins feel repetitive
- feature sprawl may weaken the main value proposition
- sensitive data handling must remain conservative to preserve trust
- future AI ambitions could pressure the team into collecting more data than necessary

## 14. Planned Post-V1 Extensions

- social/community features
- photo capture and hobby memories
- calorie and diet tracking
- AI-generated advice and summaries
- advanced recommendation engines
- wearable integrations

## 15. Product Summary

VELORA Version 1 is a focused, score-centered mobile application. Its main job is not to track everything in life, but to help users understand balance, take meaningful actions, and review trustworthy weekly progress across five domains.
