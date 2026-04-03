import { Pressable, StyleSheet, Text, View } from "react-native";

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
    gap: 10
  },
  choice: {
    alignItems: "center",
    backgroundColor: "#10141d",
    borderColor: "#293040",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  choiceSelected: {
    backgroundColor: "#7a94ff",
    borderColor: "#7a94ff"
  },
  choiceLabel: {
    color: "#d9e0f4",
    fontSize: 15,
    fontWeight: "700"
  },
  choiceLabelSelected: {
    color: "#ffffff"
  }
});
