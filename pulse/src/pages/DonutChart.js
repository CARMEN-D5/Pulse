import React, { useEffect, useState } from "react";

/**
 * Animated SVG donut chart.
 *
 * Each slice is its own <circle> with the same circumference, positioned
 * around the donut by adjusting `stroke-dashoffset`. The visible portion
 * of each slice grows from 0 -> its share of the total via a CSS
 * transition on `stroke-dasharray`. Hovering a slice nudges its
 * `stroke-width`, giving a subtle "pop".
 *
 * Props:
 *   data: [{ id, label, value, color }]
 *   size: number (px) — overall chart size
 *   thickness: number (px) — donut ring thickness
 *   centerLabel: string — line 1 of the centre text (e.g. "$487")
 *   centerSub: string — line 2 of the centre text (e.g. "spent")
 */
function DonutChart({
  data = [],
  size = 220,
  thickness = 28,
  centerLabel = "",
  centerSub = "",
}) {
  // Animate from 0 -> real values on mount.
  const [progress, setProgress] = useState(0);
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    // requestAnimationFrame ensures the initial 0 is painted before we
    // bump progress, so the CSS transition kicks in.
    const raf = requestAnimationFrame(() => setProgress(1));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Compute each slice's offset along the ring.
  let cumulative = 0;
  const slices = data.map((d) => {
    const fraction = total > 0 ? (d.value || 0) / total : 0;
    const offset = cumulative;
    cumulative += fraction;
    return { ...d, fraction, offset };
  });

  // Empty state — show a faint full ring so the chart never looks broken.
  if (total === 0) {
    return (
      <div className="donut-wrap" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          aria-label="No expenses logged yet"
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#f1e1e6"
            strokeWidth={thickness}
          />
        </svg>
        <div className="donut-center">
          <div className="donut-center-main">$0</div>
          <div className="donut-center-sub">no expenses yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        // Rotate so slices start at 12 o'clock instead of 3 o'clock.
        style={{ transform: "rotate(-90deg)" }}
        role="img"
        aria-label="Spending breakdown by category"
      >
        {/* Faint background ring so partial donuts still look complete. */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#f7eaef"
          strokeWidth={thickness}
        />
        {slices.map((slice, i) => {
          const animatedFraction = slice.fraction * progress;
          const dashLen = animatedFraction * circumference;
          const gapLen = circumference - dashLen;
          const rotateOffset = -slice.offset * circumference;

          const isHover = hoverId === slice.id;
          const w = isHover ? thickness + 4 : thickness;

          return (
            <circle
              key={slice.id}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={w}
              strokeDasharray={`${dashLen} ${gapLen}`}
              strokeDashoffset={rotateOffset}
              strokeLinecap="butt"
              style={{
                transition:
                  "stroke-dasharray 700ms cubic-bezier(0.22, 1, 0.36, 1), " +
                  `stroke-dasharray ${i * 80}ms, stroke-width 150ms ease`,
                transitionDelay: `${i * 60}ms`,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
              onTouchStart={() => setHoverId(slice.id)}
              onTouchEnd={() => setHoverId(null)}
            >
              <title>
                {slice.label}: ${slice.value.toFixed(2)} (
                {Math.round(slice.fraction * 100)}%)
              </title>
            </circle>
          );
        })}
      </svg>

      <div className="donut-center">
        {hoverId ? (
          (() => {
            const s = slices.find((x) => x.id === hoverId);
            return (
              <>
                <div className="donut-center-main" style={{ color: s.color }}>
                  ${s.value.toFixed(0)}
                </div>
                <div className="donut-center-sub">
                  {s.label} · {Math.round(s.fraction * 100)}%
                </div>
              </>
            );
          })()
        ) : (
          <>
            <div className="donut-center-main">{centerLabel}</div>
            <div className="donut-center-sub">{centerSub}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default DonutChart;
