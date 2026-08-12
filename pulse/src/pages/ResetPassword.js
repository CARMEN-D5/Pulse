import React, { useState } from "react";
import { Text, View } from "react-native";

import Icon from "../components/Icon";
import { Alert, Card, LinkButton, PrimaryButton, Screen, TextField } from "../components/ui";
import { colors } from "../theme";
import styles from "./authStyles";

function ResetPassword({ onSubmit, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) {
      setError("Please enter the email on your account.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That doesn't look like a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const result = onSubmit ? await onSubmit({ email: email.trim() }) : { ok: true };
      if (result?.ok) {
        setSent(true);
      } else {
        setError(result?.error || "We couldn't send a reset link. Please try again.");
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
            <Icon name="lock_reset" size={40} color={colors.blPrimary} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        {/* Card */}
        <Card>
          {sent ? (
            <View style={styles.form}>
              <View style={styles.successBlock} accessibilityRole="summary">
                <Icon name="check_circle" size={48} color={colors.blPrimary} />
                <Text style={styles.successText}>
                  If an account exists for <Text style={styles.successEmail}>{email}</Text>, a
                  password reset link has been sent.
                </Text>
              </View>
              <PrimaryButton
                label="Back to Sign In"
                icon="arrow_forward"
                onPress={onBackToLogin}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Alert message={error} />

              <TextField
                label="Email Address"
                icon="email"
                value={email}
                onChangeText={setEmail}
                placeholder="yourname@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />

              <PrimaryButton
                label={submitting ? "Sending…" : "Send Reset Link"}
                icon="arrow_forward"
                onPress={handleSubmit}
                loading={submitting}
              />
            </View>
          )}
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Icon name="arrow_back" size={16} color={colors.blPrimary} />
          <LinkButton label="Back to Sign In" onPress={onBackToLogin} />
        </View>
      </View>
    </Screen>
  );
}

export default ResetPassword;
