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

function SignUp({ onSubmit, onExit, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That doesn't look like a valid email.";
    }
    if (!password) {
      next.password = "Please choose a password.";
    } else if (password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    return next;
  };

  const handleSubmit = async () => {
    setServerError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = onSubmit
        ? await onSubmit({ name: name.trim(), email: email.trim(), password })
        : { ok: false, error: "Sign up is not connected to Firebase yet." };

      if (!result?.ok) {
        setServerError(result?.error || "Could not complete registration. Please try again.");
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
            <Icon name="potted_plant" size={40} color={colors.blPrimary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your journey to a Balanced Life</Text>
        </View>

        {/* Form card */}
        <Card>
          <Alert message={serverError} />

          <View style={styles.form}>
            <TextField
              label="Full Name"
              icon="person"
              value={name}
              onChangeText={setName}
              error={errors.name}
              placeholder="John Doe"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
            />

            <TextField
              label="Email Address"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <TextField
              label="Password"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              hint="Use 6+ characters."
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <PrimaryButton
              label={submitting ? "Creating account…" : "Create Free Account"}
              icon="arrow_forward"
              onPress={handleSubmit}
              loading={submitting}
            />
          </View>

          <Divider label="Or continue with" />

          {/* Social sign-up is stubbed, exactly as it was on the web. */}
          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              onPress={() => notify("Google sign-in coming soon")}
              accessibilityRole="button"
            >
              <GoogleIcon size={20} />
              <Text style={styles.socialBtnText}>Google</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              onPress={() => notify("Apple sign-in coming soon")}
              accessibilityRole="button"
            >
              <Icon name="smartphone" size={20} color={colors.blOnSurfaceVariant} />
              <Text style={styles.socialBtnText}>Apple</Text>
            </Pressable>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <LinkButton label="Sign In" onPress={onSwitchToLogin} />
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Icon name="verified_user" size={16} color={colors.blOnSurfaceVariant} />
          <Text style={styles.badgeText}>Join 20,000+ mindful members</Text>
        </View>

        {onExit ? <LinkButton label="Back" onPress={onExit} /> : null}
      </View>
    </Screen>
  );
}

export default SignUp;
