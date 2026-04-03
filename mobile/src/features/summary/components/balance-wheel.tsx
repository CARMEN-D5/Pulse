import { DOMAIN_KEYS, DOMAIN_LABELS, type DomainKey } from "@velora/shared";
import { StyleSheet, Text, View } from "react-native";

import { createShadow, domainTheme, theme } from "@/theme/tokens";

const DOMAIN_COLORS: Record<DomainKey, string> = {
  spirituality: domainTheme.spirituality.accent,
  family_friends: domainTheme.family_friends.accent,
  work_productivity: domainTheme.work_productivity.accent,
  health: domainTheme.health.accent,
  financial_wellbeing: domainTheme.financial_wellbeing.accent
};

const DOMAIN_SHORT_LABELS: Record<DomainKey, string> = {
  spirituality: "Spirit",
  family_friends: "People",
  work_productivity: "Work",
  health: "Health",
  financial_wellbeing: "Finance"
};

type BalanceWheelItem = {
  domainKey: DomainKey;
  score: number;
};

type BalanceWheelProps = {
  centerCaption?: string;
  centerValue?: string;
  items: BalanceWheelItem[];
  size?: number;
};

type Point = {
  angle: number;
  color: string;
  domainKey: DomainKey;
  labelX: number;
  labelY: number;
  outerX: number;
  outerY: number;
  score: number;
  x: number;
  y: number;
};

const RING_FACTORS = [0.25, 0.5, 0.75, 1];

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function BalanceWheel({ centerCaption, centerValue, items, size = 240 }: BalanceWheelProps) {
  const center = size / 2;
  const radius = size * 0.34;
  const labelRadius = radius + 28;
  const scoreByDomain = new Map(items.map((item) => [item.domainKey, clampScore(item.score)]));

  const points: Point[] = DOMAIN_KEYS.map((domainKey, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / DOMAIN_KEYS.length;
    const normalizedScore = (scoreByDomain.get(domainKey) ?? 0) / 100;
    const pointRadius = radius * normalizedScore;
    const outerX = center + radius * Math.cos(angle);
    const outerY = center + radius * Math.sin(angle);

    return {
      angle,
      color: DOMAIN_COLORS[domainKey],
      domainKey,
      labelX: center + labelRadius * Math.cos(angle),
      labelY: center + labelRadius * Math.sin(angle),
      outerX,
      outerY,
      score: scoreByDomain.get(domainKey) ?? 0,
      x: center + pointRadius * Math.cos(angle),
      y: center + pointRadius * Math.sin(angle)
    };
  });

  const segments = points.map((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    return {
      angle,
      key: `${point.domainKey}-${nextPoint.domainKey}`,
      left: (point.x + nextPoint.x - length) / 2,
      top: (point.y + nextPoint.y) / 2 - 1,
      width: length
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.wheel, { height: size, width: size }]}>
        {RING_FACTORS.map((factor) => {
          const ringSize = radius * 2 * factor;

          return (
            <View
              key={factor}
              style={[
                styles.ring,
                {
                  height: ringSize,
                  left: center - ringSize / 2,
                  top: center - ringSize / 2,
                  width: ringSize
                }
              ]}
            />
          );
        })}

        {points.map((point) => (
          <View
            key={`axis-${point.domainKey}`}
            style={[
              styles.axis,
              {
                left: center - 0.5,
                top: center - radius / 2,
                transform: [{ rotate: `${point.angle}rad` }],
                width: 1
              }
            ]}
          />
        ))}

        {segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.segment,
              {
                left: segment.left,
                top: segment.top,
                transform: [{ rotate: `${segment.angle}rad` }],
                width: segment.width
              }
            ]}
          />
        ))}

        {points.map((point) => (
          <View
            key={`point-${point.domainKey}`}
            style={[
              styles.point,
              {
                backgroundColor: point.color,
                borderColor: point.color,
                left: point.x - 6,
                shadowColor: point.color,
                top: point.y - 6
              }
            ]}
          />
        ))}

        {points.map((point) => (
          <View
            key={`cap-${point.domainKey}`}
            style={[
              styles.outerCap,
              {
                left: point.outerX - 4,
                top: point.outerY - 4
              }
            ]}
          />
        ))}

        {points.map((point) => (
          <View
            key={`label-${point.domainKey}`}
            style={[
              styles.labelWrap,
              {
                left: point.labelX - 34,
                top: point.labelY - 12
              }
            ]}
          >
            <Text style={styles.label}>{DOMAIN_SHORT_LABELS[point.domainKey]}</Text>
          </View>
        ))}

        <View style={styles.centerBadge}>
          {centerValue ? <Text style={styles.centerValue}>{centerValue}</Text> : null}
          {centerCaption ? <Text style={styles.centerCaption}>{centerCaption}</Text> : null}
        </View>
      </View>

      <View style={styles.legend}>
        {points.map((point) => (
          <View key={`legend-${point.domainKey}`} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: point.color }]} />
            <View style={styles.legendTextWrap}>
              <Text style={styles.legendLabel}>{DOMAIN_LABELS[point.domainKey]}</Text>
              <Text style={styles.legendValue}>{point.score.toFixed(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: {
    backgroundColor: theme.colors.borderMuted,
    height: "50%",
    position: "absolute"
  },
  centerBadge: {
    ...createShadow("sm"),
    alignItems: "center",
    backgroundColor: theme.colors.surfaceStrong,
    borderColor: theme.colors.border,
    borderRadius: 52,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 88,
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    top: "50%",
    transform: [{ translateX: -44 }, { translateY: -44 }],
    width: 88
  },
  centerCaption: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textAlign: "center",
    textTransform: "uppercase"
  },
  centerValue: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center"
  },
  container: {
    gap: 18
  },
  label: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center"
  },
  labelWrap: {
    alignItems: "center",
    position: "absolute",
    width: 68
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  legendItem: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: "48%",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  legendLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  legendSwatch: {
    borderRadius: 999,
    height: 10,
    width: 10
  },
  legendTextWrap: {
    flex: 1,
    gap: 2
  },
  legendValue: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "600"
  },
  outerCap: {
    backgroundColor: theme.colors.borderMuted,
    borderRadius: 999,
    height: 8,
    position: "absolute",
    width: 8
  },
  point: {
    borderRadius: 999,
    borderWidth: 2,
    height: 12,
    position: "absolute",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    width: 12
  },
  ring: {
    backgroundColor: "transparent",
    borderColor: theme.colors.borderMuted,
    borderRadius: 999,
    borderWidth: 1,
    position: "absolute"
  },
  segment: {
    backgroundColor: "rgba(8, 106, 105, 0.32)",
    borderRadius: 999,
    height: 2,
    position: "absolute"
  },
  wheel: {
    alignSelf: "center",
    position: "relative"
  }
});
