import React from "react";
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from "remotion";
import {
  TransitionSeries,
  linearTiming,
  springTiming,
  type TransitionPresentation,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { flip } from "@remotion/transitions/flip";
import { wipe } from "@remotion/transitions/wipe";
import { iris } from "@remotion/transitions/iris";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import type { VideoInputProps, VideoStyleId } from "../types";
import { MediaScene, type MediaSceneEffect } from "../components/MediaScene";
import { AnimatedCaption } from "../components/AnimatedCaption";
import { PriceTag } from "../components/PriceTag";
import { CTASlide } from "../components/CTASlide";
import { ColorGradeOverlay, type ColorGradeVariant } from "../components/ColorGradeOverlay";
import { GlitchOverlay } from "../components/GlitchOverlay";
import { interleaveMedia } from "../utils";

function getGrade(style: VideoStyleId): ColorGradeVariant {
  switch (style) {
    case "cinematicDark":
      return "cinematicDark";
    case "luxuryGold":
      return "luxuryGold";
    case "corporateModern":
      return "corporateModern";
    case "motivationalKinetic":
      return "viralSaturated";
    case "glitchTech":
      return "glitchMuted";
    default:
      return "none";
  }
}

function getEffects(style: VideoStyleId): MediaSceneEffect[] {
  switch (style) {
    case "luxuryGold":
      return ["kenBurnsIn", "impactPunch", "kenBurnsOut", "dollyIn", "whiplash"];
    case "corporateModern":
      return ["zoomIn", "whiplash", "zoomOut", "impactPunch"];
    case "motivationalKinetic":
      return ["impactPunch", "whiplash", "kenBurnsIn", "parallaxFloat", "shakeMicro"];
    case "glitchTech":
      return ["shakeMicro", "impactPunch", "shakeMicro", "whiplash"];
    case "cinematicDark":
      return ["impactPunch", "whiplash", "kenBurnsOut", "dollyIn"];
    default:
      return ["impactPunch", "whiplash", "kenBurnsIn", "zoomIn"];
  }
}

export const PremiumShowcase: React.FC<VideoInputProps> = (props) => {
  const {
    style,
    media: rawMedia,
    voiceoverSrc,
    musicSrc,
    musicVolume,
    captions,
    subtitleTheme,
    price,
    ctaText,
    productName,
    durationInFrames,
  } = props;
  const { fps, width, height } = useVideoConfig();
  const media = interleaveMedia(rawMedia);
  const ctaDuration = Math.round(fps * 2.5);
  const contentFrames = durationInFrames - ctaDuration;
  const scenesCount = media.length || 1;
  const framesPerScene = Math.max(fps, Math.floor(contentFrames / scenesCount));
  const transitionFrames = Math.min(Math.round(fps * 0.36), Math.floor(framesPerScene / 4));
  const effects = getEffects(style);

  /** Presentations usam props distintas (IrisProps etc.); o array é homogêneo em runtime para TransitionSeries. */
  const transitions = [
    fade(),
    slide({ direction: "from-left" }),
    flip({ direction: "from-bottom" }),
    wipe({ direction: "from-left" }),
    iris({ width, height }),
    clockWipe({ width, height }),
  ] as unknown as TransitionPresentation<Record<string, unknown>>[];

  const pickTiming = (presentationIndex: number) =>
    presentationIndex >= 4
      ? linearTiming({ durationInFrames: transitionFrames })
      : springTiming({
          durationInFrames: transitionFrames,
          config: { damping: 16, stiffness: 108, mass: 0.52 },
          durationRestThreshold: 0.001,
        });

  const grade = getGrade(style);
  const showGlitch = style === "glitchTech";

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {media.map((asset, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={framesPerScene}>
              <MediaScene asset={asset} effect={effects[i % effects.length]} />
              {price && i === 0 && <PriceTag price={price} showAtFrame={Math.round(fps * 0.8)} />}
              <ColorGradeOverlay variant={grade} grainAmount={style === "cinematicDark" ? 0.18 : 0.1} />
              {showGlitch && <GlitchOverlay intensity={0.9} />}
            </TransitionSeries.Sequence>
            {i < media.length - 1 && (
              <TransitionSeries.Transition
                presentation={transitions[i % transitions.length]}
                timing={pickTiming(i % transitions.length)}
              />
            )}
          </React.Fragment>
        ))}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({
            durationInFrames: Math.round(fps * 0.48),
            config: { damping: 18, stiffness: 95, mass: 0.6 },
            durationRestThreshold: 0.001,
          })}
        />
        <TransitionSeries.Sequence durationInFrames={ctaDuration}>
          <CTASlide text={ctaText || "Link na bio"} productName={productName} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {voiceoverSrc && <Audio src={voiceoverSrc} volume={1} />}
      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={(f) => {
            const vol = musicVolume ?? 0.15;
            return interpolate(f, [durationInFrames - fps * 2, durationInFrames], [vol, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }}
          loop
        />
      )}
      {captions.length > 0 && <AnimatedCaption captions={captions} theme={subtitleTheme} />}
    </AbsoluteFill>
  );
};
