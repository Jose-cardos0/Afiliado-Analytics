import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/** Letterbox 2.39:1 dentro do canvas + brilho de borda (look cinema scope). */
export const CinematicMatte: React.FC<{ barOpacity?: number }> = ({ barOpacity = 0.92 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const targetH = width / 2.39;
  const bar = Math.max(0, (height - targetH) / 2);
  const edgePulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.04, 0.12]);

  if (bar < 2) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 38 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: bar,
          background: `linear-gradient(180deg, rgba(0,0,0,${barOpacity}) 0%, rgba(0,0,0,${barOpacity * 0.85}) 100%)`,
          boxShadow: `inset 0 -2px 20px rgba(255,200,120,${edgePulse})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: bar,
          background: `linear-gradient(0deg, rgba(0,0,0,${barOpacity}) 0%, rgba(0,0,0,${barOpacity * 0.85}) 100%)`,
          boxShadow: `inset 0 2px 20px rgba(255,200,120,${edgePulse})`,
        }}
      />
    </AbsoluteFill>
  );
};
