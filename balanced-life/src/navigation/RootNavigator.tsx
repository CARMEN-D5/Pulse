/**
 * RootNavigator — decides which stack to show based on auth state.
 *
 * Unauthenticated → AuthStack
 * Authenticated, no assessment → OnboardingStack (assessment quiz)
 * Authenticated, has assessment → MainTabs
 */
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../shared/types/navigation.types";
import { useAuthStore } from "../features/auth/stores/authStore";
import { LoadingSpinner } from "../shared/components/LoadingSpinner";

import { AuthStack } from "./AuthStack";
import { OnboardingStack } from "./OnboardingStack";
import { MainTabs } from "./MainTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, hasCompletedAssessment } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : !hasCompletedAssessment ? (
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
