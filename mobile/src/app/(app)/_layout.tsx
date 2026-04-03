import { Redirect, Stack } from "expo-router";

import { LoadingState } from "@/components/ui/loading-state";
import { useAuthSession } from "@/providers/auth-session-provider";
import { useProfile } from "@/providers/profile-provider";
import { theme } from "@/theme/tokens";

export default function AppLayout() {
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const { isLoading: isProfileLoading, profile } = useProfile();

  if (isAuthLoading || (user && isProfileLoading)) {
    return <LoadingState title="Opening VELORA" message="Syncing your score dashboard." />;
  }

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile?.onboardingCompletedAt) {
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
