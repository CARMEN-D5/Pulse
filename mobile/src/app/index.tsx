import { StatusBar } from "expo-status-bar";

import { HomeScreen } from "@/features/home/screens/home-screen";

export default function IndexScreen() {
  return (
    <>
      <StatusBar style="light" />
      <HomeScreen />
    </>
  );
}
