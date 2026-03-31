import React, { useId } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type ColorGradeVariant =
  | "none"
  | "cinematicDark"
  | "luxuryGold"
  | "corporateModern"
  | "emotionalSoft"
  | "viralSaturated"
  | "glitchMuted";

const GRADE_STYLES: Record<
  Exclude<ColorGradeVariant, "none">,
  { filter: string; mixBlendMode: React.CSSProperties["mixBlendMode"]; overlay: string }
> = {
  cinematicDark: {
    filter: "contrast(1.08) saturate(0.82) brightness(0.92)",
    mixBlendMode: "multiply",
    overlay: "linear-gradient(180deg, rgba(10,15,30,0.45) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)",
  },
  luxuryGold: {
    filter: "contrast(1.05) saturate(1.12) brightness(1.02)",
    mixBlendMode: "soft-light",
    overlay: "linear-gradient(135deg, rgba(180,120,40,0.18) 0%, transparent 50%, rgba(40,25,10,0.25) 100%)",
  },
  corporateModern: {
    filter: "contrast(1.04) saturate(0.95) brightness(1.03)",
    mixBlendMode: "soft-light",
    overlay: "linear-gradient(180deg, rgba(15,40,55,0.12) 0%, transparent 60%)",
  },
  emotionalSoft: {
    filter: "contrast(0.98) saturate(0.9) brightness(1.05)",
    mixBlendMode: "soft-light",
    overlay: "radial-gradient(ellipse at 50% 80%, rgba(80,40,60,0.2) 0%, transparent 55%)",
  },
  viralSaturated: {
    filter: "contrast(1.12) saturate(1.35) brightness(1.04)",
    mixBlendMode: "overlay",
    overlay: "linear-gradient(180deg, rgba(255,80,0,0.08) 0%, transparent 45%)",
  },
  glitchMuted: {
    filter: "contrast(1.1) saturate(0.75) brightness(0.95)",
    mixBlendMode: "color-dodge",
    overlay: "linear-gradient(90deg, rgba(255,0,80,0.06) 0%, transparent 30%, rgba(0,255,200,0.05) 100%)",
  },
};

/** Grain + vinheta + grade de cor (CSS puro — compatível com render Vercel/Chromium). */
export const ColorGradeOverlay: React.FC<{
  variant: ColorGradeVariant;
  grainAmount?: number;
  vignetteAmount?: number;
}> = ({ variant, grainAmount = 0.12, vignetteAmount = 0.5 }) => {
  const noiseId = useId().replace(/:/g, "");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flicker = interpolate(Math.sin(frame / (fps * 0.7)), [-1, 1], [0.92, 1]);

  if (variant === "none") {
    return (
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteAmount * 0.55}) 100%)`,
          zIndex: 40,
        }}
      />
    );
  }

  const g = GRADE_STYLES[variant];

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 40 }}>
      <AbsoluteFill style={{ filter: g.filter, mixBlendMode: g.mixBlendMode, opacity: 0.85 * flicker }} />
      <AbsoluteFill
        style={{
          background: g.overlay,
          opacity: 0.9,
        }}
      />
      {/* Film grain (noise pattern via SVG) */}
      <AbsoluteFill style={{ opacity: grainAmount * flicker, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%" style={{ opacity: 0.4 }}>
          <filter id={`noiseFilter-${noiseId}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed={frame % 100} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#noiseFilter-${noiseId})`} fill="white" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${vignetteAmount * 0.65}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
