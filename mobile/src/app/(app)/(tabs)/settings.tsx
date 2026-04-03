import { StatusBar } from "expo-status-bar";

import { SettingsScreen } from "@/features/settings/screens/settings-screen";

export default function SettingsRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <SettingsScreen />
    </>
  );
}
