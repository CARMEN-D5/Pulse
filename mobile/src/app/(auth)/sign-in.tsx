import { StatusBar } from "expo-status-bar";

import { SignInScreen } from "@/features/auth/screens/sign-in-screen";

export default function SignInRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <SignInScreen />
    </>
  );
}
