import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { MediaAsset } from "../types";

export type MediaSceneEffect =
  | "zoomIn"
  | "zoomOut"
  | "panLeft"
  | "panRight"
  | "kenBurnsIn"
  | "kenBurnsOut"
  | "dollyIn"
  | "parallaxFloat"
  | "shakeMicro"
  /** Zoom rápido no início do clip (impacto tipo anúncio) */
  | "impactPunch"
  /** Entrada lateral + escala (whip / Reels) */
  | "whiplash"
  | "none";

export const MediaScene: React.FC<{
  asset: MediaAsset;
  effect?: MediaSceneEffect;
}> = ({ asset, effect = "zoomIn" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  const punchWindow = Math.max(0.12, Math.min(0.28, 180 / Math.max(durationInFrames, 1)));

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
    case "kenBurnsIn":
      transform = `scale(${interpolate(progress, [0, 1], [1.08, 1.22])}) translate(${interpolate(progress, [0, 1], [0, -2])}%, ${interpolate(progress, [0, 1], [0, -1.5])}%)`;
      break;
    case "kenBurnsOut":
      transform = `scale(${interpolate(progress, [0, 1], [1.22, 1.06])}) translate(${interpolate(progress, [0, 1], [0, 2])}%, ${interpolate(progress, [0, 1], [0, 1])}%)`;
      break;
    case "dollyIn":
      transform = `scale(${interpolate(progress, [0, 1], [1, 1.18])})`;
      break;
    case "parallaxFloat":
      transform = `scale(1.12) translateX(${Math.sin(progress * Math.PI * 2) * 12}px) translateY(${Math.cos(progress * Math.PI * 2) * 6}px)`;
      break;
    case "shakeMicro":
      transform = `scale(1.1) translate(${Math.sin(frame * 0.9) * 2}px, ${Math.cos(frame * 1.1) * 1.5}px)`;
      break;
    case "impactPunch": {
      const endF = Math.max(8, durationInFrames * punchWindow);
      if (frame < endF) {
        const t = frame / endF;
        const s = interpolate(t, [0, 1], [1.26, 1.08], { extrapolateRight: "clamp" });
        transform = `scale(${s})`;
      } else {
        const rest = (frame - endF) / Math.max(1, durationInFrames - endF);
        const s = interpolate(rest, [0, 1], [1.08, 1.18]);
        transform = `scale(${s})`;
      }
      break;
    }
    case "whiplash": {
      const endF = Math.max(8, durationInFrames * punchWindow);
      if (frame < endF) {
        const t = frame / endF;
        const s = interpolate(t, [0, 1], [1.16, 1.07], { extrapolateRight: "clamp" });
        const tx = interpolate(t, [0, 1], [6, 0], { extrapolateRight: "clamp" });
        transform = `translateX(${tx}%) scale(${s})`;
      } else {
        const rest = (frame - endF) / Math.max(1, durationInFrames - endF);
        const s = interpolate(rest, [0, 1], [1.07, 1.15]);
        transform = `scale(${s}) translateX(${interpolate(rest, [0, 1], [0, -2])}%)`;
      }
      break;
    }
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
