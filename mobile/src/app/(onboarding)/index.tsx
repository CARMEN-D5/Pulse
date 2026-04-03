import { StatusBar } from "expo-status-bar";

import { OnboardingScreen } from "@/features/onboarding/screens/onboarding-screen";

export default function OnboardingRoute() {
  return (
    <>
      <StatusBar style="light" />
      <OnboardingScreen />
    </>
  );
}
