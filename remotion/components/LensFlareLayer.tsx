import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

type FlareTone = "warm" | "cool" | "neutral";

/** Flare procedural em CSS — anima no tempo do vídeo (sem assets externos). */
export const LensFlareLayer: React.FC<{ tone?: FlareTone; intensity?: number }> = ({
  tone = "neutral",
  intensity = 0.55,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const sweep = interpolate(frame, [0, durationInFrames], [-0.15, 1.15], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const cx = sweep * 100;
  const cy = 22 + Math.sin(frame * 0.03) * 8;

  const colors =
    tone === "warm"
      ? ["rgba(255,220,160,0)", "rgba(255,180,80,0.35)", "rgba(255,240,200,0.12)", "rgba(255,220,160,0)"]
      : tone === "cool"
        ? ["rgba(160,220,255,0)", "rgba(100,180,255,0.28)", "rgba(200,240,255,0.1)", "rgba(160,220,255,0)"]
        : ["rgba(255,255,255,0)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"];

  const rot = frame * 0.15;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 36, mixBlendMode: "screen", opacity: intensity }}>
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: `radial-gradient(ellipse ${Math.round(width * 0.45)}px ${Math.round(width * 0.2)}px at ${cx}% ${cy}%, ${colors[1]} 0%, transparent 55%)`,
          transform: `rotate(${rot}deg)`,
          filter: "blur(1px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: `${Math.min(88, Math.max(8, cx - 5))}%`,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: colors[2],
          boxShadow: `0 0 ${24}px ${colors[1]}, 0 0 60px rgba(255,255,255,0.15)`,
          opacity: 0.85,
        }}
      />
    </AbsoluteFill>
  );
};
