/**
 * MainTabs — Bottom tab navigator for the main authenticated app.
 * Tabs: Dashboard, Progress, Wheel, Profile
 */
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainTabParamList } from "../shared/types/navigation.types";
import { COLORS } from "../config/theme";

import { DashboardScreen } from "../screens/main/DashboardScreen";
import { ProgressScreen } from "../screens/main/ProgressScreen";
import { WheelScreen } from "../screens/main/WheelScreen";
import { ProfileScreen } from "../screens/main/ProfileScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.background,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          // TODO: Add icon — tabBarIcon: ({ color, size }) => <Icon name="home" ... />
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: "Progress",
        }}
      />
      <Tab.Screen
        name="Wheel"
        component={WheelScreen}
        options={{
          tabBarLabel: "Balance",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}
