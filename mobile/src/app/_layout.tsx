import { Stack } from "expo-router";

import { AuthSessionProvider } from "@/providers/auth-session-provider";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#0f1117"
          }
        }}
      />
    </AuthSessionProvider>
  );
}
