import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { signUpWithEmail } from "@/features/auth/services/auth-service";
import { AuthShell } from "@/features/auth/screens/auth-shell";

export function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const session = await signUpWithEmail(email.trim(), password);

      if (session) {
        router.replace("/");
        return;
      }

      setSuccessMessage("Account created. Confirm the email if your Supabase project requires it.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Start your pilot"
      footerCopy="Already have an account?"
      footerHref="/(auth)/sign-in"
      footerLabel="Sign in"
      subtitle="Create your account first. After that, we’ll build your baseline across the five balance domains."
      title="Create your VELORA account"
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
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Choose a password"
        secureTextEntry
        value={password}
      />
      <TextField
        autoComplete="new-password"
        label="Confirm password"
        onChangeText={setConfirmPassword}
        placeholder="Repeat your password"
        secureTextEntry
        value={confirmPassword}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      <Button loading={isSubmitting} onPress={handleSignUp}>
        Create account
      </Button>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#ff9ea4",
    fontSize: 14,
    lineHeight: 20
  },
  success: {
    color: "#a9f2c2",
    fontSize: 14,
    lineHeight: 20
  }
});
