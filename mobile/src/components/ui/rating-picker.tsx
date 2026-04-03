import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme/tokens";

type RatingPickerProps = {
  onChange: (value: number) => void;
  value?: number | null;
};

export function RatingPicker({ onChange, value }: RatingPickerProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((ratingValue) => {
        const isSelected = value === ratingValue;

        return (
          <Pressable
            key={ratingValue}
            accessibilityState={{ selected: isSelected }}
            accessibilityRole="button"
            onPress={() => onChange(ratingValue)}
            style={[styles.choice, isSelected ? styles.choiceSelected : null]}
          >
            <Text style={[styles.choiceLabel, isSelected ? styles.choiceLabelSelected : null]}>
              {ratingValue}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  choice: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.54)",
    borderColor: "rgba(118, 125, 112, 0.18)",
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  choiceSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary
  },
  choiceLabel: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: "700"
  },
  choiceLabelSelected: {
    color: theme.colors.primary
  }
});
