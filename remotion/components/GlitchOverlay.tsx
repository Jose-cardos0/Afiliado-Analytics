import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/** RGB split leve (sem Three.js — seguro no render serverless). */
export const GlitchOverlay: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = Math.sin(frame * 0.35) * Math.sin(frame * 0.08);
  const active = burst > 0.65 ? Math.min(1, (burst - 0.65) * 8) : 0;
  const shift = interpolate(active, [0, 1], [0, 6 * intensity]);
  const skew = interpolate(active, [0, 1], [0, 6 * intensity]);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 41,
        opacity: 0.35 * active + 0.08,
        mixBlendMode: "screen",
      }}
    >
      <AbsoluteFill
        style={{
          background: "rgba(255,0,80,0.15)",
          transform: `translateX(${shift}px) skewX(${skew * 0.02}deg)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: "rgba(0,255,200,0.12)",
          transform: `translateX(${-shift * 0.9}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(0deg, transparent, transparent ${2 + (frame % 3)}px, rgba(0,0,0,0.15) ${3 + (frame % 3)}px)`,
          opacity: 0.15 + 0.1 * Math.sin(frame / (fps * 0.2)),
        }}
      />
    </AbsoluteFill>
  );
};
