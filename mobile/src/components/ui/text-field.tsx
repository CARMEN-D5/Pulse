import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

type TextFieldProps = TextInputProps & {
  errorMessage?: string | null;
  helperText?: string | null;
  label: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { errorMessage, helperText, label, style, ...props },
  ref
) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#6d7690"
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
    color: "#eef2ff",
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "#121620",
    borderColor: "#2a3140",
    borderRadius: 16,
    borderWidth: 1,
    color: "#ffffff",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  helper: {
    color: "#7d88a6",
    fontSize: 13,
    lineHeight: 18
  },
  error: {
    color: "#ff9ea4",
    fontSize: 13,
    lineHeight: 18
  }
});
