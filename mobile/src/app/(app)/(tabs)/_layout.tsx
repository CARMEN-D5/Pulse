import { Tabs } from "expo-router";

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8ba3ff",
        tabBarInactiveTintColor: "#69738c",
        tabBarStyle: {
          backgroundColor: "#11151f",
          borderTopColor: "#1f2532"
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600"
        },
        sceneStyle: {
          backgroundColor: "#0f1117"
        }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="check-in" options={{ title: "Check-In" }} />
      <Tabs.Screen name="actions" options={{ title: "Actions" }} />
      <Tabs.Screen name="summary" options={{ title: "Summary" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
