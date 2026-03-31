import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

/** Card de abertura com física de spring (documentação Remotion: spring). */
export const IntroTitleCard: React.FC<{ title: string; durationInFrames: number }> = ({
  title,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    fps,
    frame,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
  });

  const exitStart = durationInFrames - Math.min(18, Math.round(fps * 0.45));
  const out = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(enter, [0, 1], [0.82, 1]);
  const opacity = enter * out;

  return (
    <AbsoluteFill
      style={{
        zIndex: 55,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.82) 100%)`,
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          padding: "28px 48px",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(12,12,18,0.65)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          maxWidth: "88%",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: 52,
            lineHeight: 1.15,
            color: "#F5F0E8",
            letterSpacing: 0.5,
            textShadow: "0 2px 24px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </p>
        <div
          style={{
            marginTop: 18,
            height: 3,
            borderRadius: 2,
            background: "linear-gradient(90deg, transparent, rgba(238,77,45,0.9), transparent)",
            opacity: enter,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
