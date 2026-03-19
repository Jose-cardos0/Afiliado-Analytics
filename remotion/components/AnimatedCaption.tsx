import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { CaptionWord, SubtitleTheme } from "../types";

const WORDS_PER_PAGE = 3;

type Page = {
  tokens: CaptionWord[];
  startMs: number;
  endMs: number;
};

function buildPages(words: CaptionWord[]): Page[] {
  if (words.length === 0) return [];
  const pages: Page[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
    const chunk = words.slice(i, i + WORDS_PER_PAGE);
    pages.push({
      tokens: chunk,
      startMs: chunk[0].startMs,
      endMs: chunk[chunk.length - 1].endMs,
    });
  }
  return pages;
}

export const AnimatedCaption: React.FC<{
  captions: CaptionWord[];
  theme: SubtitleTheme;
}> = ({ captions, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const pages = React.useMemo(() => buildPages(captions), [captions]);

  const activePage = pages.find(
    (p) => currentMs >= p.startMs - 50 && currentMs <= p.endMs + 300
  );
  if (!activePage) return null;

  const pageStartFrame = Math.round((activePage.startMs / 1000) * fps);
  const localFrame = Math.max(0, frame - pageStartFrame);

  const enterProgress = spring({
    fps,
    frame: localFrame,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });

  const posY =
    theme.position === "top" ? "10%" :
    theme.position === "center" ? "42%" : "75%";

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          top: posY,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          opacity: interpolate(enterProgress, [0, 0.2, 1], [0, 1, 1]),
          transform: `scale(${interpolate(enterProgress, [0, 1], [0.8, 1])})`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            maxWidth: "92%",
            padding: theme.bgColor !== "transparent" ? "14px 28px" : "6px 10px",
            borderRadius: 14,
            backgroundColor: theme.bgColor,
          }}
        >
          {activePage.tokens.map((token, i) => {
            const isActive = currentMs >= token.startMs;
            const tokenStartFrame = Math.round((token.startMs / 1000) * fps);
            const tokenLocalFrame = isActive ? Math.max(0, frame - tokenStartFrame) : 0;

            const wordPop = spring({
              fps,
              frame: tokenLocalFrame,
              config: { damping: 8, stiffness: 250 },
            });

            return (
              <span
                key={`${token.startMs}-${i}`}
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: theme.fontSize,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: isActive ? theme.color : "rgba(255,255,255,0.25)",
                  WebkitTextStroke: `${theme.strokeWidth}px ${theme.strokeColor}`,
                  paintOrder: "stroke fill",
                  display: "inline-block",
                  transform: isActive
                    ? `scale(${interpolate(wordPop, [0, 1], [0.5, 1])})`
                    : "scale(0.8)",
                  textShadow: isActive
                    ? `0 2px 12px rgba(0,0,0,0.6), 0 0 30px ${theme.strokeColor === "#000000" ? "rgba(0,0,0,0.4)" : theme.strokeColor + "40"}`
                    : "none",
                }}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
