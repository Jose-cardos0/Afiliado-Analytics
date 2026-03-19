import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { MediaAsset } from "../types";

export const MediaScene: React.FC<{
  asset: MediaAsset;
  effect?: "zoomIn" | "zoomOut" | "panLeft" | "panRight" | "none";
}> = ({ asset, effect = "zoomIn" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  let transform = "";
  switch (effect) {
    case "zoomIn":
      transform = `scale(${interpolate(progress, [0, 1], [1, 1.15])})`;
      break;
    case "zoomOut":
      transform = `scale(${interpolate(progress, [0, 1], [1.15, 1])})`;
      break;
    case "panLeft":
      transform = `translateX(${interpolate(progress, [0, 1], [0, -40])}px) scale(1.1)`;
      break;
    case "panRight":
      transform = `translateX(${interpolate(progress, [0, 1], [0, 40])}px) scale(1.1)`;
      break;
    default:
      break;
  }

  const commonStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform,
  };

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      {asset.type === "image" ? (
        <Img src={asset.src} style={commonStyle} />
      ) : (
        <OffthreadVideo src={asset.src} style={commonStyle} muted />
      )}
    </AbsoluteFill>
  );
};
