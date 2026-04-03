import { Stack } from "expo-router";

import { AuthSessionProvider } from "@/providers/auth-session-provider";
import { ProfileProvider } from "@/providers/profile-provider";
import { theme } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <ProfileProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.colors.background
            }
          }}
        />
      </ProfileProvider>
    </AuthSessionProvider>
  );
}
