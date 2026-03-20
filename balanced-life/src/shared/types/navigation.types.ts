/**
 * Navigation type definitions for type-safe navigation throughout the app.
 */

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type OnboardingStackParamList = {
  AssessmentIntro: undefined;
  AssessmentQuiz: undefined;
  ScoreReveal: { result: import("../../features/scoring/types/scoring.types").BalanceScoreResult };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Progress: undefined;
  Missions: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  CheckIn: undefined;
  CheckInResult: { result: import("../../features/check-in/services/checkInService").CheckInResult };
  DomainDetail: { domainId: string };
  Journal: undefined;
  Budget: undefined;
  Todos: undefined;
  Activity: undefined;
  Friends: undefined;
};
