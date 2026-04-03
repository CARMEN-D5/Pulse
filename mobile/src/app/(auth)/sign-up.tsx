import { StatusBar } from "expo-status-bar";

import { SignUpScreen } from "@/features/auth/screens/sign-up-screen";

export default function SignUpRoute() {
  return (
    <>
      <StatusBar style="dark" />
      <SignUpScreen />
    </>
  );
}
