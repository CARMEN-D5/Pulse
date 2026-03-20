import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../../config/theme";
import { DomainId, DOMAINS, DOMAIN_IDS } from "../../../config/domains";

interface Props {
  selected: DomainId | null;
  onSelect: (id: DomainId | null) => void;
}

export function DomainChips({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* "All" chip — shows Balance Score */}
      <TouchableOpacity
        style={[styles.chip, selected === null && styles.activeChip]}
        onPress={() => onSelect(null)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipLabel,
            selected === null && { color: "#FFFFFF" },
          ]}
        >
          Balance Score
        </Text>
      </TouchableOpacity>

      {/* Domain chips */}
      {DOMAIN_IDS.map((id) => {
        const domain = DOMAINS[id];
        const isActive = selected === id;
        return (
          <TouchableOpacity
            key={id}
            style={[
              styles.chip,
              isActive && { backgroundColor: domain.color },
            ]}
            onPress={() => onSelect(id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: isActive ? "#FFFFFF" : domain.color },
              ]}
            />
            <Text
              style={[
                styles.chipLabel,
                isActive && { color: "#FFFFFF" },
              ]}
            >
              {domain.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
