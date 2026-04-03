import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

type SectionHeaderProps = {
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

export function SectionHeader({ eyebrow, subtitle, title }: SectionHeaderProps) {
  return (
    <View style={styles.wrapper}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40
  },
  wrapper: {
    gap: 12,
    marginBottom: 4
  }
});
