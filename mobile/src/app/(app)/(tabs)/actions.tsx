import { StatusBar } from "expo-status-bar";

import { ActionsHubScreen } from "@/features/actions/screens/actions-hub-screen";

export default function ActionsRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <ActionsHubScreen />
    </>
  );
}
