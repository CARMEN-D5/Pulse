import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

type CardProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#171a22",
    borderColor: "#272c38",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 20
  }
});
