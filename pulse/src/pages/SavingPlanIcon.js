import React from "react";
import { StyleSheet, Text } from "react-native";

import Icon from "../components/Icon";
import { colors } from "../theme";

// Keep storing the original emoji values so existing Firestore documents and
// older clients remain compatible. The predefined choices render through the
// bundled icon font, which is more consistent across iOS and Android.
export const SAVING_PLAN_ICON_OPTIONS = [
  { value: "✈️", name: "flight", label: "Travel" },
  { value: "🏠", name: "home", label: "Home" },
  { value: "🚗", name: "directions_car", label: "Car" },
  { value: "💻", name: "laptop", label: "Computer" },
  { value: "📱", name: "smartphone", label: "Phone" },
  { value: "🎓", name: "school", label: "Education" },
  { value: "💍", name: "diamond", label: "Jewellery" },
  { value: "🎁", name: "card_giftcard", label: "Gift" },
  { value: "🏖️", name: "beach_access", label: "Holiday" },
  { value: "💰", name: "savings", label: "Savings" },
  { value: "🐶", name: "pets", label: "Pet" },
  { value: "🎮", name: "sports_esports", label: "Gaming" },
];

const ICON_BY_VALUE = Object.fromEntries(
  SAVING_PLAN_ICON_OPTIONS.map((option) => [option.value, option])
);

export function isSafeCustomSavingIcon(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !/[\u0000-\u001F\u007F\uFFFD]/u.test(trimmed);
}

export default function SavingPlanIcon({ value, size = 20, color = colors.text, style }) {
  const option = ICON_BY_VALUE[value];
  if (option) {
    return <Icon name={option.name} size={size} color={color} style={style} />;
  }

  if (isSafeCustomSavingIcon(value)) {
    return <Text style={[styles.custom, { fontSize: size, lineHeight: size + 4 }, style]}>{value}</Text>;
  }

  return <Icon name="savings" size={size} color={color} style={style} />;
}

const styles = StyleSheet.create({
  custom: { color: colors.text, textAlign: "center" },
});
