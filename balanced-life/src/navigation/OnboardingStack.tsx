import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../shared/types/navigation.types";
import { AssessmentIntroScreen } from "../features/assessment/screens/AssessmentIntroScreen";
import { AssessmentQuizScreen } from "../features/assessment/screens/AssessmentQuizScreen";
import { ScoreRevealScreen } from "../features/assessment/screens/ScoreRevealScreen";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="AssessmentIntro" component={AssessmentIntroScreen} />
      <Stack.Screen name="AssessmentQuiz" component={AssessmentQuizScreen} />
      <Stack.Screen name="ScoreReveal" component={ScoreRevealScreen} />
    </Stack.Navigator>
  );
}
