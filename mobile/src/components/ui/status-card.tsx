import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { theme } from "@/theme/tokens";

type StatusTone = "error" | "info" | "neutral" | "success";

type StatusCardProps = {
  loading?: boolean;
  message: string;
  title?: string;
  tone?: StatusTone;
};

const TONE_STYLES: Record<StatusTone, { accent: string; track: string; text: string }> = {
  error: {
    accent: theme.colors.danger,
    text: "#7D2727",
    track: "rgba(172, 52, 52, 0.09)"
  },
  info: {
    accent: theme.colors.secondary,
    text: "#405271",
    track: "rgba(214, 227, 255, 0.52)"
  },
  neutral: {
    accent: theme.colors.textSoft,
    text: theme.colors.textMuted,
    track: "rgba(255, 255, 255, 0.44)"
  },
  success: {
    accent: theme.colors.success,
    text: "#1F6449",
    track: "rgba(47, 140, 104, 0.10)"
  }
};

export function StatusCard({
  loading = false,
  message,
  title,
  tone = "neutral"
}: StatusCardProps) {
  const toneStyles = TONE_STYLES[tone];

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: toneStyles.track,
          borderColor: `${toneStyles.accent}33`
        }
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: toneStyles.accent }]} />
        <View style={styles.copyWrap}>
          {title ? <Text style={[styles.title, { color: toneStyles.text }]}>{title}</Text> : null}
          <Text style={[styles.message, { color: toneStyles.text }]}>{message}</Text>
        </View>
        {loading ? <ActivityIndicator color={toneStyles.accent} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0
  },
  copyWrap: {
    flex: 1,
    gap: 4
  },
  dot: {
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  message: {
    fontSize: 14,
    lineHeight: 20
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18
  }
});
