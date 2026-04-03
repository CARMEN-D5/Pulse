import { forwardRef } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";

import { theme } from "@/theme/tokens";

type TextFieldProps = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  errorMessage?: string | null;
  helperText?: string | null;
  label: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { containerStyle, errorMessage, helperText, label, style, ...props },
  ref
) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textSoft}
        ref={ref}
        style={[styles.input, style]}
        {...props}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!errorMessage && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: 8
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.54)",
    borderColor: "rgba(118, 125, 112, 0.22)",
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  helper: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18
  },
  error: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 18
  }
});
