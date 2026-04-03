import { Link } from "expo-router";
import { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";

type AuthShellProps = PropsWithChildren<{
  footerCopy: string;
  footerHref: "/(auth)/sign-in" | "/(auth)/sign-up";
  footerLabel: string;
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
  subtitle,
  title
}: AuthShellProps) {
  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Card>{children}</Card>

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
  hero: {
    gap: 12,
    marginBottom: 24
  },
  eyebrow: {
    color: "#8ba3ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  subtitle: {
    color: "#b8c2dc",
    fontSize: 16,
    lineHeight: 24
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20
  },
  footerCopy: {
    color: "#8f99b3",
    fontSize: 14
  },
  footerLink: {
    color: "#8ba3ff",
    fontSize: 14,
    fontWeight: "700"
  }
});
