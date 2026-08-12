import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import GoogleIcon from "../components/GoogleIcon";
import Icon from "../components/Icon";
import {
  Alert,
  Card,
  Divider,
  LinkButton,
  PrimaryButton,
  Screen,
  TextField,
} from "../components/ui";
import { colors } from "../theme";
import { notify } from "../utils/dialogs";
import styles from "./authStyles";

function Login({ onSubmit, onForgotPassword, onBack, onSwitchToSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!email.trim()) {
      next.email = "Enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That doesn't look like a valid email.";
    }
    if (!password) next.password = "Enter your password.";
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    setLoginError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = onSubmit
        ? await onSubmit({ email: email.trim(), password })
        : { ok: false, error: "Auth is not wired up." };

      if (!result?.ok) {
        setLoginError(result?.error || "Login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen center>
      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Icon name="self_care" size={40} color={colors.blPrimary} />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back to Pulse</Text>
        </View>

        {/* Form card */}
        <Card>
          <Alert message={loginError} />

          <View style={styles.form}>
            <TextField
              label="Email Address"
              icon="email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="yourname@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <View>
              <TextField
                label="Password"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <View style={styles.forgotRow}>
                <LinkButton label="Forgot Password?" onPress={onForgotPassword} align="end" />
              </View>
            </View>

            <PrimaryButton
              label={submitting ? "Signing in…" : "Sign In"}
              icon="arrow_forward"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>

          <Divider label="OR" />

          {/* Social sign-in is stubbed, exactly as it was on the web. */}
          <View style={styles.socialCircles}>
            <Pressable
              style={({ pressed }) => [styles.socialCircle, pressed && styles.pressed]}
              onPress={() => notify("Google sign-in coming soon")}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              <GoogleIcon size={20} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.socialCircle, pressed && styles.pressed]}
              onPress={() => notify("Apple sign-in coming soon")}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Apple"
            >
              <Icon name="smartphone" size={22} color={colors.blOnSurface} />
            </Pressable>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <LinkButton label="Sign Up" onPress={onSwitchToSignUp} />
        </View>

        {onBack ? <LinkButton label="Back" onPress={onBack} /> : null}
      </View>
    </Screen>
  );
}

export default Login;
