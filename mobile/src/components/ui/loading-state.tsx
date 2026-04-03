import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";

export function LoadingState({ message, title }: { message: string; title: string }) {
  return (
    <Screen>
      <View style={styles.wrapper}>
        <ActivityIndicator color="#8ba3ff" size="large" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center"
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700"
  },
  message: {
    color: "#aab4cf",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
    textAlign: "center"
  }
});
