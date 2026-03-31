import React from "react";
import { AbsoluteFill, Sequence, Audio, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { VideoInputProps } from "../types";
import { MediaScene } from "../components/MediaScene";
import { AnimatedCaption } from "../components/AnimatedCaption";
import { PriceTag } from "../components/PriceTag";
import { CTASlide } from "../components/CTASlide";
import { interleaveMedia } from "../utils";

const ShakeWrapper: React.FC<{ children: React.ReactNode; intensity?: number }> = ({ children, intensity = 1 }) => {
  const frame = useCurrentFrame();
  const shakeWindow = 4;
  const isShaking = frame < shakeWindow;
  const x = isShaking ? Math.sin(frame * 8) * 6 * intensity : 0;
  const y = isShaking ? Math.cos(frame * 6) * 4 * intensity : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const FlashOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.round(fps * 0.12)], [0.8, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#EE4D2D", opacity, pointerEvents: "none" }} />;
};

export const FlashSaleVideo: React.FC<VideoInputProps> = (props) => {
  const { media, voiceoverSrc, musicSrc, musicVolume, captions, subtitleTheme, price, ctaText, productName, durationInFrames } = props;
  const { fps } = useVideoConfig();

  const ordered = interleaveMedia(media);
  const ctaDuration = Math.round(fps * 2.5);
  const contentFrames = durationInFrames - ctaDuration;
  const scenesCount = ordered.length || 1;
  const framesPerScene = Math.max(Math.round(fps * 0.8), Math.floor(contentFrames / scenesCount));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {ordered.map((asset, i) => {
        const from = i * framesPerScene;
        return (
          <Sequence key={i} from={from} durationInFrames={framesPerScene}>
            <ShakeWrapper intensity={1.2}>
              <MediaScene asset={asset} effect={i % 2 === 0 ? "zoomIn" : "zoomOut"} />
            </ShakeWrapper>
            <FlashOverlay />
            {price && i === 0 && <PriceTag price={price} showAtFrame={Math.round(fps * 0.5)} />}
          </Sequence>
        );
      })}

      <Sequence from={contentFrames} durationInFrames={ctaDuration}>
        <CTASlide text={ctaText || "Compre agora!"} productName={productName} />
      </Sequence>

      {voiceoverSrc && <Audio src={voiceoverSrc} volume={1} />}
      {musicSrc && (
        <Audio src={musicSrc} volume={(f) => {
          const vol = musicVolume ?? 0.2;
          return interpolate(f, [durationInFrames - fps, durationInFrames], [vol, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        }} loop />
      )}
      {captions.length > 0 && (
        <AnimatedCaption captions={captions} theme={subtitleTheme} />
      )}
    </AbsoluteFill>
  );
};
