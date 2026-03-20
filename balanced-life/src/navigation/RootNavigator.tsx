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
import { ActivityScreen } from "../features/activity/screens/ActivityScreen";
import { SocialScreen } from "../features/social/screens/SocialScreen";
import { BudgetScreen } from "../features/budget/screens/BudgetScreen";
import { JournalScreen } from "../features/journal/screens/JournalScreen";
import { TodoScreen } from "../features/todos/screens/TodoScreen";
import { DomainDetailScreen } from "../features/domain-detail/screens/DomainDetailScreen";
import { MissionsScreen } from "../features/missions/screens/MissionsScreen";

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
          <Stack.Screen
            name="Activity"
            component={ActivityScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Friends"
            component={SocialScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Budget"
            component={BudgetScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Journal"
            component={JournalScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Todos"
            component={TodoScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="DomainDetail"
            component={DomainDetailScreen}
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="Missions"
            component={MissionsScreen}
            options={{ animation: "slide_from_right" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
