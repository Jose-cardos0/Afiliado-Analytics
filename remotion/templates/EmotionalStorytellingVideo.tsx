import React from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import type { VideoInputProps } from "../types";
import { MediaScene } from "../components/MediaScene";
import { AnimatedCaption } from "../components/AnimatedCaption";
import { CTASlide } from "../components/CTASlide";
import { ColorGradeOverlay } from "../components/ColorGradeOverlay";
import { interleaveMedia } from "../utils";

const EFFECTS = ["kenBurnsIn", "panRight", "kenBurnsOut", "zoomIn"] as const;

export const EmotionalStorytellingVideo: React.FC<VideoInputProps> = (props) => {
  const {
    media: rawMedia,
    voiceoverSrc,
    musicSrc,
    musicVolume,
    captions,
    subtitleTheme,
    ctaText,
    productName,
    durationInFrames,
  } = props;
  const { fps } = useVideoConfig();
  const media = interleaveMedia(rawMedia);

  const ctaDuration = Math.round(fps * 3);
  const contentFrames = durationInFrames - ctaDuration;
  const scenesCount = media.length || 1;
  const framesPerScene = Math.max(fps * 2, Math.floor(contentFrames / scenesCount));
  const transitionFrames = Math.round(fps * 0.95);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <TransitionSeries>
        {media.map((asset, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={framesPerScene}>
              <MediaScene asset={asset} effect={EFFECTS[i % EFFECTS.length]} />
              <ColorGradeOverlay variant="emotionalSoft" grainAmount={0.14} vignetteAmount={0.62} />
            </TransitionSeries.Sequence>
            {i < media.length - 1 && (
              <TransitionSeries.Transition
                presentation={i % 2 === 0 ? fade() : slide({ direction: "from-bottom" })}
                timing={springTiming({
                  durationInFrames: transitionFrames,
                  config: { damping: 22, stiffness: 72, mass: 0.85 },
                  durationRestThreshold: 0.001,
                })}
              />
            )}
          </React.Fragment>
        ))}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            durationInFrames: Math.round(fps * 0.72),
            config: { damping: 24, stiffness: 68, mass: 0.9 },
            durationRestThreshold: 0.001,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={ctaDuration}>
          <CTASlide text={ctaText || "Confira o link"} productName={productName} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {voiceoverSrc && <Audio src={voiceoverSrc} volume={1} />}
      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={(f) => {
            const vol = musicVolume ?? 0.12;
            const fadeIn = interpolate(f, [0, fps * 2], [0, vol], { extrapolateRight: "clamp" });
            const fadeOut = interpolate(f, [durationInFrames - fps * 2, durationInFrames], [vol, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return Math.min(fadeIn, fadeOut);
          }}
          loop
        />
      )}

      {captions.length > 0 && (
        <AnimatedCaption captions={captions} theme={subtitleTheme} />
      )}
    </AbsoluteFill>
  );
};
