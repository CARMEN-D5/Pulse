import React from "react";
import { View } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { DomainId, DOMAIN_IDS, DOMAINS } from "../../../config/domains";
import { DomainScores } from "../../scoring/types/scoring.types";

interface RadarChartProps {
  scores: DomainScores;
  size?: number;
}

const LEVELS = [20, 40, 60, 80, 100];

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

export function RadarChart({ scores, size = 300 }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = size * 0.38;
  const labelRadius = size * 0.47;
  const count = DOMAIN_IDS.length;
  const angleStep = 360 / count;

  // Get vertices for a given set of values (0-100)
  function getPolygonPoints(values: number[]): string {
    return values
      .map((val, i) => {
        const radius = (val / 100) * maxRadius;
        const point = polarToCartesian(center, center, radius, i * angleStep);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  }

  const scoreValues = DOMAIN_IDS.map((id) => scores[id]);
  const dataPoints = scoreValues.map((val, i) => {
    const radius = (val / 100) * maxRadius;
    return polarToCartesian(center, center, radius, i * angleStep);
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        {/* Background grid levels */}
        {LEVELS.map((level) => {
          const points = DOMAIN_IDS.map((_, i) => {
            const r = (level / 100) * maxRadius;
            const p = polarToCartesian(center, center, r, i * angleStep);
            return `${p.x},${p.y}`;
          }).join(" ");
          return (
            <Polygon
              key={level}
              points={points}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines from center to each vertex */}
        {DOMAIN_IDS.map((_, i) => {
          const p = polarToCartesian(center, center, maxRadius, i * angleStep);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon (filled area) */}
        <Polygon
          points={getPolygonPoints(scoreValues)}
          fill="rgba(46, 117, 182, 0.2)"
          stroke="#2E75B6"
          strokeWidth={2}
        />

        {/* Data points (dots on each vertex) */}
        {dataPoints.map((point, i) => (
          <Circle
            key={`dot-${i}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={DOMAINS[DOMAIN_IDS[i]].color}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {/* Domain labels */}
        {DOMAIN_IDS.map((id, i) => {
          const domain = DOMAINS[id];
          const p = polarToCartesian(center, center, labelRadius, i * angleStep);
          const score = scores[id];

          // Adjust text anchor based on position
          let textAnchor: "start" | "middle" | "end" = "middle";
          if (p.x < center - 10) textAnchor = "end";
          else if (p.x > center + 10) textAnchor = "start";

          return (
            <React.Fragment key={`label-${id}`}>
              <SvgText
                x={p.x}
                y={p.y - 6}
                fontSize={11}
                fontWeight="600"
                fill={domain.color}
                textAnchor={textAnchor}
              >
                {domain.label}
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y + 10}
                fontSize={13}
                fontWeight="700"
                fill={domain.color}
                textAnchor={textAnchor}
              >
                {score}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
