import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const CTASlide: React.FC<{
  text: string;
  productName?: string;
}> = ({ text, productName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = spring({ fps, frame, config: { damping: 20, stiffness: 100 } });
  const textScale = spring({ fps, frame: Math.max(0, frame - 6), config: { damping: 12, stiffness: 160 } });
  const subtitleOpacity = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #EE4D2D 0%, #D43B1A 60%, #1a1a2e 100%)",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${bgScale})`,
      }}
    >
      <div style={{ textAlign: "center", padding: "0 40px" }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#FFF",
            fontFamily: "Arial Black, sans-serif",
            transform: `scale(${textScale})`,
            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
            lineHeight: 1.2,
          }}
        >
          {text}
        </div>
        {productName && (
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              color: "rgba(255,255,255,0.8)",
              fontFamily: "Arial, sans-serif",
              opacity: subtitleOpacity,
            }}
          >
            {productName}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
