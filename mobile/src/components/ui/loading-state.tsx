import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { theme } from "@/theme/tokens";

export function LoadingState({ message, title }: { message: string; title: string }) {
  return (
    <Screen contentStyle={styles.screen}>
      <Card style={styles.panel} variant="highlight">
        <View style={styles.spinnerWrap}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: "center"
  },
  panel: {
    alignItems: "center",
    gap: 12,
    marginHorizontal: 8,
    paddingVertical: 28
  },
  spinnerWrap: {
    alignItems: "center",
    backgroundColor: "rgba(156, 235, 232, 0.28)",
    borderRadius: theme.radii.xl,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700"
  },
  message: {
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
    textAlign: "center"
  }
});
