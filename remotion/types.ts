export type MediaAsset = {
  type: "image" | "video";
  src: string;
  durationInSeconds?: number;
};

export type CaptionWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type VideoStyleId =
  | "showcase"
  | "storytelling"
  | "fastCuts"
  | "beforeAfter"
  | "reviewRapido";

export type SubtitleTheme = {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  position: "top" | "center" | "bottom";
};

export type VideoInputProps = {
  style: VideoStyleId;
  media: MediaAsset[];
  voiceoverSrc: string | null;
  musicSrc: string | null;
  musicVolume: number;
  captions: CaptionWord[];
  subtitleTheme: SubtitleTheme;
  productName: string;
  price: string;
  ctaText: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
};

export const SUBTITLE_THEMES: Record<string, SubtitleTheme> = {
  tiktokBold: {
    fontFamily: "Arial Black, sans-serif",
    fontSize: 52,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 4,
    bgColor: "transparent",
    position: "center",
  },
  capcut: {
    fontFamily: "Arial Black, sans-serif",
    fontSize: 48,
    color: "#FFFF00",
    strokeColor: "#000000",
    strokeWidth: 3,
    bgColor: "rgba(0,0,0,0.5)",
    position: "bottom",
  },
  classico: {
    fontFamily: "Arial, sans-serif",
    fontSize: 40,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 2,
    bgColor: "rgba(0,0,0,0.7)",
    position: "bottom",
  },
  shopeeOrange: {
    fontFamily: "Arial, sans-serif",
    fontSize: 44,
    color: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: 3,
    bgColor: "#EE4D2D",
    position: "bottom",
  },
  neon: {
    fontFamily: "Impact, sans-serif",
    fontSize: 50,
    color: "#00FF88",
    strokeColor: "#000000",
    strokeWidth: 4,
    bgColor: "transparent",
    position: "center",
  },
};

export const VIDEO_STYLES: Record<VideoStyleId, { label: string; description: string }> = {
  showcase: {
    label: "Showcase Produto",
    description: "Imagens com zoom suave, preço animado, CTA no final",
  },
  storytelling: {
    label: "Storytelling",
    description: "Cenas em sequência com narração, legendas word-by-word",
  },
  fastCuts: {
    label: "Cortes Rápidos",
    description: "Imagens alternando rápido com texto grande e impacto",
  },
  beforeAfter: {
    label: "Antes & Depois",
    description: "Comparação lado a lado com transição slide",
  },
  reviewRapido: {
    label: "Review Rápido",
    description: "Mix de imagens e vídeos com overlay de avaliação",
  },
};
