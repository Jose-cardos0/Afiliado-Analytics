import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from "remotion";
import type { CaptionWord, SubtitleTheme } from "../types";

/** Poucas palavras por bloco = mais impacto visual (estilo anúncio / Reels premium). */
const WORDS_PER_PAGE = 2;

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

/**
 * Legenda única “nível agência”: punch de escala + overshoot, micro-rotação,
 * brilho dinâmico na palavra ativa e hierarquia forte entre ativo / espera.
 */
export const ProCinematicCaption: React.FC<{
  captions: CaptionWord[];
  theme: SubtitleTheme;
}> = ({ captions, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const pages = React.useMemo(() => buildPages(captions), [captions]);

  const activePage = pages.find(
    (p) => currentMs >= p.startMs - 80 && currentMs <= p.endMs + 400,
  );
  if (!activePage) return null;

  const pageStartFrame = Math.round((activePage.startMs / 1000) * fps);
  const localFrame = Math.max(0, frame - pageStartFrame);

  const blockEnter = spring({
    fps,
    frame: localFrame,
    config: { damping: 14, stiffness: 260, mass: 0.55 },
  });

  const posY =
    theme.position === "top" ? "8%" : theme.position === "center" ? "40%" : "72%";

  const blockScale = interpolate(blockEnter, [0, 1], [0.88, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const blockY = interpolate(blockEnter, [0, 1], [28, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          padding: "0 14px",
          transform: `translateY(${blockY}px) scale(${blockScale})`,
          opacity: interpolate(blockEnter, [0, 0.12, 1], [0, 1, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            maxWidth: "94%",
            padding:
              theme.bgColor !== "transparent"
                ? "16px 32px"
                : "10px 14px",
            borderRadius: 18,
            backgroundColor:
              theme.bgColor !== "transparent" ? theme.bgColor : "rgba(0,0,0,0.42)",
            backdropFilter: theme.bgColor === "transparent" ? "blur(10px)" : undefined,
            WebkitBackdropFilter: theme.bgColor === "transparent" ? "blur(10px)" : undefined,
            boxShadow:
              "0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
            border:
              theme.bgColor === "transparent"
                ? "1px solid rgba(255,255,255,0.12)"
                : undefined,
          }}
        >
          {activePage.tokens.map((token, i) => {
            const isActive = currentMs >= token.startMs;
            const tokenStartFrame = Math.round((token.startMs / 1000) * fps);
            const tokenLocalFrame = isActive ? Math.max(0, frame - tokenStartFrame) : 0;

            const pop = spring({
              fps,
              frame: tokenLocalFrame,
              config: { damping: 9, stiffness: 420, mass: 0.38 },
            });

            const scale = interpolate(pop, [0, 0.55, 1], [0.42, 1.1, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const rotate = interpolate(pop, [0, 1], [-9, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const pulse =
              isActive && tokenLocalFrame > 3
                ? 1 + Math.sin(frame * 0.35 + i) * 0.018
                : 1;

            const glow =
              isActive && theme.color
                ? `0 0 22px ${theme.color}55, 0 4px 24px rgba(0,0,0,0.75), 0 0 2px rgba(255,255,255,0.35)`
                : "0 4px 20px rgba(0,0,0,0.7)";

            return (
              <span
                key={`${token.startMs}-${i}`}
                style={{
                  fontFamily: theme.fontFamily,
                  fontSize: theme.fontSize * (isActive ? 1 : 0.92),
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: isActive ? theme.color : "rgba(255,255,255,0.32)",
                  WebkitTextStroke: `${theme.strokeWidth}px ${theme.strokeColor}`,
                  paintOrder: "stroke fill",
                  display: "inline-block",
                  transform: `rotate(${rotate}deg) scale(${scale * pulse})`,
                  textShadow: glow,
                  filter: isActive ? "saturate(1.08)" : "saturate(0.65)",
                  transition: "none",
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
