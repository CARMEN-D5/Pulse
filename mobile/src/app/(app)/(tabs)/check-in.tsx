import { StatusBar } from "expo-status-bar";

import { CheckInScreen } from "@/features/check-in/screens/check-in-screen";

export default function CheckInRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <CheckInScreen />
    </>
  );
}
