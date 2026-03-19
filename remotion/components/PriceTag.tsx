import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const PriceTag: React.FC<{
  price: string;
  showAtFrame?: number;
}> = ({ price, showAtFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < showAtFrame || !price) return null;

  const localFrame = frame - showAtFrame;
  const scale = spring({ fps, frame: localFrame, config: { damping: 10, stiffness: 150 } });
  const opacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 150,
        right: 30,
        display: "flex",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EE4D2D",
        padding: "10px 22px",
        borderRadius: 16,
        transform: `scale(${scale})`,
        opacity,
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ color: "#FFF", fontSize: 20, fontWeight: 600 }}>por apenas</span>
      <span style={{ color: "#FFF", fontSize: 36, fontWeight: 900, fontFamily: "Arial Black, sans-serif" }}>
        {price}
      </span>
    </div>
  );
};
