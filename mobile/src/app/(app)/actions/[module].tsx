import { StatusBar } from "expo-status-bar";

import { ActionModuleScreen } from "@/features/actions/screens/action-module-screen";

export default function ActionModuleRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <ActionModuleScreen />
    </>
  );
}
