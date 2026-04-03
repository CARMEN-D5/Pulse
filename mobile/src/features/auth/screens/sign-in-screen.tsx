import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { signInWithEmail } from "@/features/auth/services/auth-service";
import { AuthShell } from "@/features/auth/screens/auth-shell";

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
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in right now.");
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
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Button loading={isSubmitting} onPress={handleSignIn}>
        Sign in
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  }
});
