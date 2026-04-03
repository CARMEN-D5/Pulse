import { StatusBar } from "expo-status-bar";

import { SummaryScreen } from "@/features/summary/screens/summary-screen";

export default function SummaryRoute() {
  return (
    <>
      <StatusBar style="light" />
      <SummaryScreen />
    </>
  );
}
