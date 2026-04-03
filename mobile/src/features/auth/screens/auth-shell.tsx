import { Link } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { createShadow, theme } from "@/theme/tokens";

type AuthShellProps = PropsWithChildren<{
  footerCopy: string;
  footerHref: "/(auth)/sign-in" | "/(auth)/sign-up";
  footerLabel: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  eyebrow: string;
  subtitle: string;
  title: string;
}>;

export function AuthShell({
  children,
  eyebrow,
  footerCopy,
  footerHref,
  footerLabel,
  iconName,
  subtitle,
  title
}: AuthShellProps) {
  return (
    <Screen contentStyle={styles.screenContent} scrollable>
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons color={theme.colors.primary} name={iconName} size={34} />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Card style={styles.formCard} variant="highlight">
        {children}
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerCopy}>{footerCopy}</Text>
        <Link href={footerHref} style={styles.footerLink}>
          {footerLabel}
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
    paddingTop: 40
  },
  hero: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  iconBadge: {
    ...createShadow("md"),
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: theme.colors.border,
    borderRadius: 28,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    marginBottom: 8,
    width: 80
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    textAlign: "center"
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
    textAlign: "center"
  },
  formCard: {
    paddingTop: 24
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 4
  },
  footerCopy: {
    color: theme.colors.textMuted,
    fontSize: 14
  },
  footerLink: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700"
  }
});
