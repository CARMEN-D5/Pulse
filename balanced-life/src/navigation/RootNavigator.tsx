/**
 * RootNavigator — decides which stack to show based on auth state.
 *
 * Unauthenticated → AuthStack
 * Authenticated, no assessment → OnboardingStack (assessment quiz)
 * Authenticated, has assessment → MainTabs + modal screens
 */
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../shared/types/navigation.types";
import { useAuthStore } from "../features/auth/stores/authStore";
import { LoadingSpinner } from "../shared/components/LoadingSpinner";

import { AuthStack } from "./AuthStack";
import { OnboardingStack } from "./OnboardingStack";
import { MainTabs } from "./MainTabs";
import { CheckInScreen } from "../features/check-in/screens/CheckInScreen";
import { CheckInResultScreen } from "../features/check-in/screens/CheckInResultScreen";
import { WeeklyReviewScreen } from "../features/weekly-review/screens/WeeklyReviewScreen";

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
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="CheckIn"
            component={CheckInScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="CheckInResult"
            component={CheckInResultScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="WeeklyReview"
            component={WeeklyReviewScreen}
            options={{ animation: "slide_from_bottom" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
