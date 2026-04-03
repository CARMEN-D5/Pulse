import { Stack } from "expo-router";

import { AuthSessionProvider } from "@/providers/auth-session-provider";
import { ProfileProvider } from "@/providers/profile-provider";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <ProfileProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#0f1117"
            }
          }}
        />
      </ProfileProvider>
    </AuthSessionProvider>
  );
}
