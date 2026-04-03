import { Redirect, Stack } from "expo-router";

import { LoadingState } from "@/components/ui/loading-state";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";

export default function OnboardingLayout() {
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const { isLoading: isProfileLoading, profile } = useProfile();

  if (isAuthLoading || (user && isProfileLoading)) {
    return <LoadingState title="Loading onboarding" message="Checking your profile status." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile?.onboardingCompletedAt) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#0f1117"
        }
      }}
    />
  );
}
