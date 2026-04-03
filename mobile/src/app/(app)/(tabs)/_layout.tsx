import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { theme } from "@/theme/tokens";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarActiveBackgroundColor: "rgba(156, 235, 232, 0.36)",
        tabBarInactiveTintColor: theme.colors.textSoft,
        tabBarStyle: {
          backgroundColor: "rgba(255, 255, 255, 0.76)",
          borderTopColor: "rgba(255,255,255,0.68)",
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 20,
          paddingHorizontal: 12,
          paddingTop: 10
        },
        tabBarItemStyle: {
          borderRadius: 24,
          marginHorizontal: 4
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600"
        },
        sceneStyle: {
          backgroundColor: theme.colors.background
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? "home" : "home-outline"} size={20} />
          )
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Check-In",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? "checkbox" : "checkbox-outline"} size={20} />
          )
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: "Actions",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? "flash" : "flash-outline"} size={20} />
          )
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Summary",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? "stats-chart" : "stats-chart-outline"} size={20} />
          )
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons color={color} name={focused ? "person" : "person-outline"} size={20} />
          )
        }}
      />
    </Tabs>
  );
}
