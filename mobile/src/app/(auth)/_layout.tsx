import { Redirect, Stack } from "expo-router";

import { LoadingState } from "@/components/ui/loading-state";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";
import { theme } from "@/theme/tokens";

export default function AuthLayout() {
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const { isLoading: isProfileLoading, profile } = useProfile();

  if (isAuthLoading || (user && isProfileLoading)) {
    return <LoadingState title="Loading account" message="Getting your access ready." />;
  }

  if (user && profile?.onboardingCompletedAt) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  if (user && !profile?.onboardingCompletedAt) {
    return <Redirect href="/(onboarding)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background
        }
      }}
    />
  );
}
