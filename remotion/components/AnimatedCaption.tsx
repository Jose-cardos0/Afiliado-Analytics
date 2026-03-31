import React from "react";
import type { CaptionWord, SubtitleTheme } from "../types";
import { ProCinematicCaption } from "./ProCinematicCaption";

/** Uma única pipeline de legenda premium (sem presets frágeis no UI). */
export const AnimatedCaption: React.FC<{
  captions: CaptionWord[];
  theme: SubtitleTheme;
}> = ({ captions, theme }) => {
  if (!captions.length) return null;
  return <ProCinematicCaption captions={captions} theme={theme} />;
};
