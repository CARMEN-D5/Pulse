// Shared UI primitives.
//
// These are the React Native equivalents of the reusable class families the
// web build kept in auth.css — `.auth-glass-card`, `.auth-glass-input`,
// `.auth-glass-cta`, `.dash-card` and friends. Screens compose these instead
// of restating the same padding/radius/shadow on every view.
import React, { forwardRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "./Icon";
import ScreenGradient from "./ScreenGradient";
import { colors, radius, shadow, spacing, type } from "../theme";

/**
 * Full-screen container: gradient background, safe-area padding, and an
 * optional scroll view that lifts out of the way of the keyboard.
 *
 * `scroll={false}` gives a plain flex container for screens that manage their
 * own list scrolling (FlatList-based feeds, for example).
 *
 * Tab screens rendered inside <AppShell> pass `gradient={false}` and
 * `safeArea={false}`: the shell already paints the background and reserves the
 * notch/home-indicator space, so repeating either here would double the inset.
 */
export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  style,
  center = false,
  gradient = true,
  keyboardAvoiding = true,
  safeArea = true,
}) {
  const insets = useSafeAreaInsets();
  const padding = safeArea
    ? { paddingTop: insets.top, paddingBottom: insets.bottom }
    : null;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        center && styles.centerContent,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, center && styles.centerContent, contentContainerStyle]}>
      {children}
    </View>
  );

  const withKeyboard = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  const inner = <View style={[styles.flex, padding, style]}>{withKeyboard}</View>;

  return gradient ? <ScreenGradient>{inner}</ScreenGradient> : inner;
}

/** Frosted card — the `.auth-glass-card` / `.dash-card` surface. */
export function Card({ children, style, strong = false }) {
  return (
    <View style={[styles.card, strong && styles.cardStrong, shadow("md"), style]}>{children}</View>
  );
}

/**
 * Back-arrow + title row used at the top of every inner screen. The web build
 * repeated this markup on each domain page.
 */
export function ScreenHeader({ title, subtitle, onBack, right, style }) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow_back" size={22} color={colors.blOnSurface} />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}

      <View style={styles.headerTitles}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** Primary call-to-action — `.auth-glass-cta`. */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  variant = "primary",
}) {
  const isDisabled = disabled || loading;
  const variantStyle = variant === "danger" ? styles.ctaDanger : styles.ctaPrimary;
  const labelColor = variant === "danger" ? "#fff" : colors.blOnPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.cta,
        variantStyle,
        shadow("sm"),
        pressed && !isDisabled && styles.ctaPressed,
        isDisabled && styles.ctaDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <>
          <Text style={[styles.ctaText, { color: labelColor }, textStyle]}>{label}</Text>
          {icon ? <Icon name={icon} size={20} color={labelColor} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Low-emphasis text button — `.link-btn` / `.auth-glass-forgot`. */
export function LinkButton({ label, onPress, style, textStyle, align = "center" }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [{ alignSelf: alignSelfFor(align) }, pressed && styles.pressed, style]}
    >
      <Text style={[styles.linkText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

function alignSelfFor(align) {
  if (align === "start") return "flex-start";
  if (align === "end") return "flex-end";
  return "center";
}

/**
 * Labelled text field — `.auth-glass-field`. Handles the leading icon, the
 * focus ring, the password visibility toggle and the inline error line that
 * the web version built out of three separate elements.
 */
export const TextField = forwardRef(function TextField(
  {
    label,
    icon,
    error,
    hint,
    secureTextEntry = false,
    style,
    inputStyle,
    containerStyle,
    ...inputProps
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={[styles.field, containerStyle, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          Boolean(error) && styles.inputWrapError,
        ]}
      >
        {icon ? (
          <Icon
            name={icon}
            size={20}
            color={focused ? colors.blPrimary : colors.blOutline}
            style={styles.inputIcon}
          />
        ) : null}

        <TextInput
          ref={ref}
          style={[styles.input, !icon && styles.inputNoIcon, inputStyle]}
          placeholderTextColor={colors.blOutlineVariant}
          secureTextEntry={isPassword && !revealed}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            style={styles.inputToggle}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Icon
              name={revealed ? "visibility_off" : "visibility"}
              size={20}
              color={colors.blOutlineVariant}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
});

/** Inline error / success banner — `.auth-glass-alert` and `.alert-*`. */
export function Alert({ message, tone = "error", style }) {
  if (!message) return null;
  return (
    <View style={[styles.alert, tone === "success" ? styles.alertSuccess : styles.alertError, style]}>
      <Text style={[styles.alertText, tone === "success" && styles.alertTextSuccess]}>{message}</Text>
    </View>
  );
}

/** "or continue with" rule — `.auth-glass-divider`. */
export function Divider({ label, style }) {
  return (
    <View style={[styles.divider, style]}>
      <View style={styles.dividerLine} />
      {label ? <Text style={styles.dividerText}>{label}</Text> : null}
      <View style={styles.dividerLine} />
    </View>
  );
}

/** Centred spinner for whole-screen loading states. */
export function Loading({ label, style }) {
  return (
    <View style={[styles.loading, style]}>
      <ActivityIndicator size="large" color={colors.blPrimary} />
      {label ? <Text style={styles.loadingText}>{label}</Text> : null}
    </View>
  );
}

/** Placeholder for a list or section with nothing in it yet. */
export function EmptyState({ icon = "inbox", title, message, style }) {
  return (
    <View style={[styles.empty, style]}>
      <Icon name={icon} size={40} color={colors.blOutlineVariant} />
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      {message ? <Text style={styles.emptyText}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: { opacity: 0.6 },

  card: {
    width: "100%",
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  cardStrong: { backgroundColor: colors.glassStrong },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
  },
  headerTitles: { flex: 1 },
  headerTitle: { ...type.h3, color: colors.blOnSurface },
  headerSubtitle: { ...type.small, color: colors.blOnSurfaceVariant },
  headerRight: { minWidth: 40, alignItems: "flex-end" },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
  },
  ctaPrimary: { backgroundColor: colors.blPrimary },
  ctaDanger: { backgroundColor: colors.blError },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...type.title, fontSize: 16 },

  linkText: { ...type.label, color: colors.blPrimary },

  field: { gap: 6 },
  fieldLabel: {
    ...type.label,
    color: colors.blOnSurfaceVariant,
    paddingLeft: spacing.xs,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.blOutlineVariant,
  },
  // The web build used an inset box-shadow to thicken the ring on focus;
  // a border-width change is the React Native equivalent, and negative margin
  // keeps the extra pixel from nudging the field's height.
  inputWrapFocused: {
    borderWidth: 2,
    borderColor: colors.blPrimary,
    backgroundColor: "#fff",
    margin: -1,
  },
  inputWrapError: {
    borderWidth: 2,
    borderColor: colors.blError,
    margin: -1,
  },
  inputIcon: { marginLeft: spacing.lg },
  input: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingLeft: spacing.md,
    paddingRight: spacing.lg,
    ...type.body,
    color: colors.blOnSurface,
  },
  inputNoIcon: { paddingLeft: spacing.lg },
  inputToggle: { paddingRight: spacing.lg },
  fieldError: { ...type.caption, fontSize: 12, color: colors.blError, paddingLeft: spacing.xs },
  fieldHint: {
    ...type.caption,
    fontSize: 12,
    color: colors.blOnSurfaceVariant,
    paddingLeft: spacing.xs,
  },

  alert: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  alertError: {
    backgroundColor: "rgba(172, 52, 52, 0.08)",
    borderColor: "rgba(172, 52, 52, 0.15)",
  },
  alertSuccess: {
    backgroundColor: "rgba(47, 158, 122, 0.10)",
    borderColor: "rgba(47, 158, 122, 0.20)",
  },
  alertText: { ...type.bodyMedium, fontSize: 13, color: colors.blError },
  alertTextSuccess: { color: colors.success },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(174, 180, 166, 0.3)" },
  dividerText: {
    paddingHorizontal: spacing.lg,
    ...type.caption,
    letterSpacing: 2,
    fontFamily: type.label.fontFamily,
    color: "rgba(118, 125, 112, 0.7)",
  },

  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { ...type.body, color: colors.blOnSurfaceVariant },

  empty: { alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...type.title, color: colors.blOnSurface },
  emptyText: { ...type.small, color: colors.blOnSurfaceVariant, textAlign: "center" },
});
