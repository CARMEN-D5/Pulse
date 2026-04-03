import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DOMAIN_LABELS, type DomainKey } from "@velora/shared";
import { StyleSheet, Text, View } from "react-native";

import { domainTheme, theme } from "@/theme/tokens";

type DomainBadgeProps = {
  compact?: boolean;
  domainKey: DomainKey;
};

export function DomainBadge({ compact = false, domainKey }: DomainBadgeProps) {
  const domain = domainTheme[domainKey];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: domain.soft },
        compact ? styles.badgeCompact : null
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${domain.accent}20` }]}>
        <MaterialCommunityIcons
          color={domain.accent}
          name={domain.icon as keyof typeof MaterialCommunityIcons.glyphMap}
          size={compact ? 14 : 16}
        />
      </View>
      <Text style={[styles.label, compact ? styles.labelCompact : null]}>
        {compact ? domain.shortLabel : DOMAIN_LABELS[domainKey]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: theme.radii.pill,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm
  },
  badgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: theme.radii.pill,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  labelCompact: {
    fontSize: 12
  }
});
