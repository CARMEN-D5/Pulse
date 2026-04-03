import { router } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusCard } from "@/components/ui/status-card";
import { TextField } from "@/components/ui/text-field";
import { signInWithEmail } from "@/features/auth/services/auth-service";
import { AuthShell } from "@/features/auth/screens/auth-shell";
import { toHelpfulErrorMessage } from "@/lib/errors";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await signInWithEmail(email.trim(), password);
      router.replace("/");
    } catch (error) {
      setErrorMessage(toHelpfulErrorMessage(error, "Unable to sign in right now."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      footerCopy="Need an account?"
      footerHref="/(auth)/sign-up"
      footerLabel="Create one"
      iconName="hand-heart"
      subtitle="Sign in to continue your balance tracking, check-ins, and weekly summaries."
      title="VELORA"
    >
      <TextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      <TextField
        autoComplete="password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        value={password}
      />
      {errorMessage ? (
        <StatusCard message={errorMessage} title="Sign-in failed" tone="error" />
      ) : null}
      <Button loading={isSubmitting} onPress={handleSignIn}>
        Sign in
      </Button>
    </AuthShell>
  );
}
