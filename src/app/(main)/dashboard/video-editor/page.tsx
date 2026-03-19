"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Player } from "@remotion/player";
import {
  Film, Upload, Loader2, Wand2, Mic, Play, Pause, Image as ImageIcon,
  Music, AlertCircle, ChevronLeft, ChevronRight, Sparkles, Download,
  Check, X, Volume2, Search, Trash2,
} from "lucide-react";
import { VideoComposition } from "../../../../../remotion/VideoComposition";
import {
  VIDEO_STYLES, SUBTITLE_THEMES,
  type VideoInputProps, type VideoStyleId, type MediaAsset, type CaptionWord, type SubtitleTheme,
} from "../../../../../remotion/types";

type Voice = { voice_id: string; name: string; preview_url: string | null; labels: Record<string, string> };

const STEPS = [
  { id: 1, title: "Mídia", icon: ImageIcon },
  { id: 2, title: "Copy & Voz", icon: Mic },
  { id: 3, title: "Estilo", icon: Sparkles },
  { id: 4, title: "Preview & Exportar", icon: Film },
];

const inputCls = "w-full rounded-xl border border-dark-border bg-dark-bg py-2 px-3 text-text-primary text-sm placeholder-text-secondary/50 focus:outline-none focus:border-shopee-orange transition-colors";
const selectCls = inputCls;
const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-shopee-orange px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-all shadow-[0_2px_12px_rgba(238,77,45,0.2)]";
const btnSecondary = "inline-flex items-center gap-1.5 rounded-xl border border-dark-border px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-dark-bg transition-colors";

export default function VideoEditorPage() {
  const [step, setStep] = useState(1);

  // ── Step 1: Media ──
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [productName, setProductName] = useState("");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Set<number>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<MediaAsset[]>([]);

  // ── Step 2: Copy & Voz ──
  const [copyText, setCopyText] = useState("");
  const [copyStyle, setCopyStyle] = useState<"vendas" | "humor" | "urgencia">("vendas");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceAudioDuration, setVoiceAudioDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [captions, setCaptions] = useState<CaptionWord[]>([]);

  // ── Step 3: Estilo ──
  const [videoStyle, setVideoStyle] = useState<VideoStyleId>("showcase");
  const [subtitleThemeKey, setSubtitleThemeKey] = useState("tiktokBold");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [ctaText, setCtaText] = useState("Link na bio");
  const [price, setPrice] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.15);

  // ── Step 4 ──
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimensions = useMemo(() => {
    switch (aspectRatio) {
      case "9:16": return { width: 1080, height: 1920 };
      case "1:1": return { width: 1080, height: 1080 };
      case "16:9": return { width: 1920, height: 1080 };
    }
  }, [aspectRatio]);

  const fps = 30;
  const selectedAssets = useMemo(() => {
    const picked = Array.from(selectedMedia)
      .sort((a, b) => a - b)
      .map((i) => mediaAssets[i])
      .filter(Boolean);
    return [...picked, ...uploadedFiles];
  }, [selectedMedia, mediaAssets, uploadedFiles]);

  const totalDurationSec = useMemo(() => {
    if (voiceAudioDuration > 0) return Math.ceil(voiceAudioDuration) + 3;
    return Math.max(10, selectedAssets.length * 4);
  }, [voiceAudioDuration, selectedAssets.length]);

  const durationInFrames = totalDurationSec * fps;

  const subtitleTheme: SubtitleTheme = SUBTITLE_THEMES[subtitleThemeKey] ?? SUBTITLE_THEMES.tiktokBold;

  const compositionProps: VideoInputProps = useMemo(() => ({
    style: videoStyle,
    media: selectedAssets,
    voiceoverSrc: voiceAudioUrl,
    musicSrc: musicUrl,
    musicVolume,
    captions,
    subtitleTheme,
    productName,
    price,
    ctaText,
    fps,
    width: dimensions.width,
    height: dimensions.height,
    durationInFrames,
  }), [videoStyle, selectedAssets, voiceAudioUrl, musicUrl, musicVolume, captions, subtitleTheme, productName, price, ctaText, dimensions, durationInFrames]);

  // ── Shopee search ──
  const handleShopeeSearch = useCallback(async () => {
    if (!shopeeUrl.trim()) return;
    setSearching(true); setError(null);
    try {
      const res = await fetch("/api/video-editor/download-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: shopeeUrl, mode: "scrape" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao buscar produto");
      const media: MediaAsset[] = (json.media ?? []).map((m: { url: string; type: string }) => ({
        type: m.type === "video" ? "video" as const : "image" as const,
        src: m.url,
      }));
      setMediaAssets(media);
      setProductName(json.productName ?? "");
      setSelectedMedia(new Set(media.map((_, i) => i)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setSearching(false);
    }
  }, [shopeeUrl]);

  // ── File upload ──
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAssets: MediaAsset[] = [];
    for (const f of Array.from(files)) {
      const url = URL.createObjectURL(f);
      const type = f.type.startsWith("video/") ? "video" as const : "image" as const;
      newAssets.push({ type, src: url });
    }
    setUploadedFiles((prev) => [...prev, ...newAssets]);
  }, []);

  // ── Generate copy ──
  const handleGenerateCopy = useCallback(async () => {
    if (!productName.trim()) return;
    setGeneratingCopy(true); setError(null);
    try {
      const res = await fetch("/api/video-editor/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, style: copyStyle, videoDuration: totalDurationSec - 3 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao gerar copy");
      setCopyText(json.copy ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setGeneratingCopy(false);
    }
  }, [productName, copyStyle, totalDurationSec]);

  // ── Load voices ──
  useEffect(() => {
    setLoadingVoices(true);
    fetch("/api/video-editor/elevenlabs-voices")
      .then((r) => r.json())
      .then((j) => { setVoices(j.voices ?? []); if (j.voices?.[0]) setVoiceId(j.voices[0].voice_id); })
      .catch(() => {})
      .finally(() => setLoadingVoices(false));
  }, []);

  // ── Generate voice (ElevenLabs with-timestamps → áudio + captions sincronizadas) ──
  const handleGenerateVoice = useCallback(async () => {
    if (!copyText.trim() || !voiceId) return;
    setGeneratingVoice(true); setError(null); setTranscribing(true);
    try {
      const res = await fetch("/api/video-editor/elevenlabs-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: copyText, voiceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao gerar voz");

      const audioBase64: string = json.audioBase64 ?? "";
      const apiCaptions: CaptionWord[] = json.captions ?? [];

      // Converte base64 → blob → URL para o <audio> e para o Remotion
      const byteString = atob(audioBase64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      setVoiceAudioUrl(url);

      const audio = new Audio(url);
      audio.onloadedmetadata = () => setVoiceAudioDuration(audio.duration);

      if (apiCaptions.length > 0) {
        setCaptions(apiCaptions);
      } else {
        // Fallback: distribui palavras proporcionalmente se a API não retornou timestamps
        const audioDur = await new Promise<number>((resolve) => {
          const a = new Audio(url);
          a.onloadedmetadata = () => resolve(a.duration * 1000);
          a.onerror = () => resolve(totalDurationSec * 1000);
        });
        const words = copyText.trim().split(/\s+/);
        const totalChars = words.reduce((s, w) => s + w.length, 0);
        let cursor = 0;
        const fallback: CaptionWord[] = words.map((w) => {
          const ratio = w.length / totalChars;
          const dur = audioDur * ratio;
          const cap: CaptionWord = { text: w, startMs: Math.round(cursor), endMs: Math.round(cursor + dur) };
          cursor += dur;
          return cap;
        });
        setCaptions(fallback);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setGeneratingVoice(false);
      setTranscribing(false);
    }
  }, [copyText, voiceId, totalDurationSec]);

  // ── Music upload ──
  const handleMusicUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMusicUrl(URL.createObjectURL(file));
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-shopee-orange/15 border border-shopee-orange/25 flex items-center justify-center">
          <Film className="h-4 w-4 text-shopee-orange" />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary">Gerador de Criativos</h1>
          <p className="text-[11px] text-text-secondary/70">Importe da Shopee, gere copy + voz com IA, escolha o estilo e exporte em MP4</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = s.id < step;
          return (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-shopee-orange text-white"
                    : done
                      ? "bg-shopee-orange/15 text-shopee-orange"
                      : "bg-dark-card border border-dark-border text-text-secondary"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {s.title}
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-text-secondary/30" />}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
        </div>
      )}

      {/* ══════════════════ STEP 1: MÍDIA ══════════════════ */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left: Import */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Search className="h-4 w-4 text-shopee-orange" /> Importar da Shopee
            </h2>
            <div className="flex gap-2">
              <input type="text" value={shopeeUrl} onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder="Cole o link do produto Shopee" className={`${inputCls} flex-1`}
                onKeyDown={(e) => e.key === "Enter" && handleShopeeSearch()} />
              <button type="button" onClick={handleShopeeSearch} disabled={searching || !shopeeUrl.trim()} className={btnPrimary}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </button>
            </div>

            {productName && (
              <div className="rounded-xl border border-dark-border/60 bg-dark-bg/40 px-3 py-2">
                <p className="text-xs text-text-secondary/60">Produto</p>
                <p className="text-sm font-semibold text-text-primary truncate">{productName}</p>
              </div>
            )}

            {mediaAssets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase mb-2">
                  Selecione as mídias ({selectedMedia.size}/{mediaAssets.length})
                </p>
                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {mediaAssets.map((asset, i) => {
                    const selected = selectedMedia.has(i);
                    return (
                      <button key={i} type="button"
                        onClick={() => setSelectedMedia((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        })}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selected ? "border-shopee-orange" : "border-dark-border/40 opacity-60 hover:opacity-100"
                        }`}>
                        {asset.type === "image" ? (
                          <img src={asset.src} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={asset.src} muted className="w-full h-full object-cover" />
                        )}
                        {selected && (
                          <div className="absolute inset-0 bg-shopee-orange/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-white drop-shadow-lg" />
                          </div>
                        )}
                        <span className="absolute top-1 right-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                          {asset.type === "video" ? "VID" : "IMG"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-auto pt-2">
              <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-dark-border/60 py-4 cursor-pointer hover:border-shopee-orange/40 transition-colors">
                <Upload className="h-4 w-4 text-text-secondary" />
                <span className="text-xs text-text-secondary">Ou envie seus próprios arquivos</span>
                <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {/* Right: Selected + uploaded preview */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-text-primary">Mídias selecionadas ({selectedAssets.length})</h2>
            {selectedAssets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-secondary/40">
                <ImageIcon className="h-12 w-12" />
                <p className="text-xs text-center">Importe da Shopee ou envie arquivos</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 flex-1 content-start">
                {selectedAssets.map((asset, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-dark-border/40">
                    {asset.type === "image" ? (
                      <img src={asset.src} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={asset.src} muted className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 shrink-0 mt-auto">
              <button type="button" onClick={() => setStep(2)} disabled={selectedAssets.length === 0} className={`flex-1 ${btnPrimary}`}>
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 2: COPY & VOZ ══════════════════ */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left: Copy */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-shopee-orange" /> Gerar Copy com IA
            </h2>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Nome do produto</label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Fone Bluetooth TWS" className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Estilo</label>
              <select value={copyStyle} onChange={(e) => setCopyStyle(e.target.value as typeof copyStyle)} className={selectCls}>
                <option value="vendas">Vendas persuasiva</option>
                <option value="humor">Humor viral</option>
                <option value="urgencia">Urgência e escassez</option>
              </select>
            </div>

            <button type="button" onClick={handleGenerateCopy} disabled={generatingCopy || !productName.trim()} className={btnPrimary}>
              {generatingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar Copy
            </button>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Texto da narração {copyText && `(${copyText.split(/\s+/).length} palavras)`}
              </label>
              <textarea value={copyText} onChange={(e) => setCopyText(e.target.value)}
                placeholder="Cole ou gere a copy com IA..." rows={6}
                className={`${inputCls} resize-none h-full min-h-[120px]`} />
            </div>
          </div>

          {/* Right: Voice */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Mic className="h-4 w-4 text-shopee-orange" /> Gerar Voz com IA
            </h2>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Voz</label>
              {loadingVoices ? (
                <div className="flex items-center gap-2 text-xs text-text-secondary py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando vozes…
                </div>
              ) : (
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={selectCls}>
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name} {v.labels?.accent ? `(${v.labels.accent})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button type="button" onClick={handleGenerateVoice}
              disabled={generatingVoice || !copyText.trim() || !voiceId}
              className={btnPrimary}>
              {generatingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
              {generatingVoice ? "Gerando voz e legendas…" : "Gerar Voz + Legendas"}
            </button>

            {voiceAudioUrl && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">
                    Áudio gerado ({voiceAudioDuration.toFixed(1)}s)
                  </span>
                </div>
                <audio src={voiceAudioUrl} controls className="w-full h-8" />
                {captions.length > 0 ? (
                  <p className="text-[11px] text-emerald-300/70 flex items-center gap-1">
                    <Check className="h-3 w-3" /> {captions.length} palavras com legendas sincronizadas
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-400/70">
                    Legendas serão geradas ao clicar "Gerar Voz + Legendas" novamente
                  </p>
                )}
              </div>
            )}

            {transcribing && !voiceAudioUrl && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando áudio e sincronizando legendas…
              </div>
            )}

            <div className="mt-auto">
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                <Music className="h-3 w-3 inline mr-1" /> Música de fundo (opcional)
              </label>
              <div className="flex items-center gap-2">
                <label className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed border-dark-border/60 py-2.5 cursor-pointer hover:border-shopee-orange/40 transition-colors ${musicUrl ? "border-emerald-500/30" : ""}`}>
                  {musicUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Upload className="h-3.5 w-3.5 text-text-secondary" />}
                  <span className="text-xs text-text-secondary">{musicUrl ? "Música carregada" : "Enviar MP3"}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
                </label>
                {musicUrl && (
                  <button type="button" onClick={() => setMusicUrl(null)} className="p-2 text-text-secondary hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {musicUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <Volume2 className="h-3 w-3 text-text-secondary" />
                  <input type="range" min={0} max={0.5} step={0.01} value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-shopee-orange" />
                  <span className="text-[10px] text-text-secondary w-8 text-right">{Math.round(musicVolume * 100)}%</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setStep(1)} className={btnSecondary}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
              <button type="button" onClick={() => setStep(3)} className={`flex-1 ${btnPrimary}`}>
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 3: ESTILO ══════════════════ */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left: Style options */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-text-primary">Estilo do vídeo</h2>

            <div className="grid grid-cols-1 gap-2">
              {Object.entries(VIDEO_STYLES).map(([key, val]) => (
                <button key={key} type="button"
                  onClick={() => setVideoStyle(key as VideoStyleId)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    videoStyle === key
                      ? "border-shopee-orange bg-shopee-orange/10"
                      : "border-dark-border/50 hover:border-dark-border"
                  }`}>
                  <p className={`text-sm font-semibold ${videoStyle === key ? "text-shopee-orange" : "text-text-primary"}`}>
                    {val.label}
                  </p>
                  <p className="text-[11px] text-text-secondary/60 mt-0.5">{val.description}</p>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Formato</label>
              <div className="flex gap-2">
                {(["9:16", "1:1", "16:9"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setAspectRatio(r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      aspectRatio === r
                        ? "border-shopee-orange bg-shopee-orange/10 text-shopee-orange"
                        : "border-dark-border text-text-secondary hover:border-dark-border"
                    }`}>
                    {r === "9:16" ? "Stories" : r === "1:1" ? "Feed" : "Paisagem"} ({r})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">Preço (opcional)</label>
                <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="R$ 49,90" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">CTA final</label>
                <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Link na bio" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Right: Subtitle theme */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-text-primary">Estilo das legendas</h2>

            <div className="grid grid-cols-1 gap-2 flex-1">
              {Object.entries(SUBTITLE_THEMES).map(([key, theme]) => (
                <button key={key} type="button"
                  onClick={() => setSubtitleThemeKey(key)}
                  className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                    subtitleThemeKey === key
                      ? "border-shopee-orange bg-shopee-orange/10"
                      : "border-dark-border/50 hover:border-dark-border"
                  }`}>
                  <div
                    className="shrink-0 rounded-lg w-24 h-10 flex items-center justify-center"
                    style={{
                      backgroundColor: theme.bgColor !== "transparent" ? theme.bgColor : "#222",
                    }}
                  >
                    <span style={{
                      fontFamily: theme.fontFamily,
                      fontSize: 14,
                      fontWeight: 900,
                      color: theme.color,
                      WebkitTextStroke: `${theme.strokeWidth * 0.3}px ${theme.strokeColor}`,
                      paintOrder: "stroke fill",
                    }}>
                      Legenda
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${subtitleThemeKey === key ? "text-shopee-orange" : "text-text-primary"}`}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 shrink-0 mt-auto">
              <button type="button" onClick={() => setStep(2)} className={btnSecondary}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
              <button type="button" onClick={() => setStep(4)} className={`flex-1 ${btnPrimary}`}>
                Preview <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 4: PREVIEW & EXPORT ══════════════════ */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
          {/* Left: Settings summary */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-6 space-y-4 order-2 lg:order-1">
            <h2 className="text-sm font-bold text-text-primary">Resumo</h2>

            <div className="space-y-2 text-xs">
              <Row label="Estilo" value={VIDEO_STYLES[videoStyle].label} />
              <Row label="Mídias" value={`${selectedAssets.length} arquivo(s)`} />
              <Row label="Formato" value={`${dimensions.width}×${dimensions.height} (${aspectRatio})`} />
              <Row label="Duração" value={`~${totalDurationSec}s (${durationInFrames} frames @ ${fps}fps)`} />
              <Row label="Voz IA" value={voiceAudioUrl ? `${voiceAudioDuration.toFixed(1)}s` : "Não"} />
              <Row label="Legendas" value={captions.length > 0 ? `${captions.length} palavras` : "Não"} />
              <Row label="Música" value={musicUrl ? `Vol: ${Math.round(musicVolume * 100)}%` : "Não"} />
              <Row label="CTA" value={ctaText || "—"} />
              <Row label="Preço" value={price || "—"} />
            </div>

            <div className="pt-2 space-y-2">
              <p className="text-[11px] text-text-secondary/50">
                A renderização do MP4 requer o Remotion CLI configurado no servidor (Vercel Sandbox ou Lambda).
                No momento, use o Preview acima para validar o criativo.
              </p>
              <button type="button" onClick={() => setStep(3)} className={`w-full ${btnSecondary} justify-center`}>
                <ChevronLeft className="h-4 w-4" /> Editar
              </button>
            </div>
          </div>

          {/* Right: Player */}
          <div className="bg-dark-card rounded-2xl border border-dark-border p-4 flex flex-col items-center gap-3 order-1 lg:order-2">
            <p className="text-xs font-semibold text-text-secondary uppercase">Preview em tempo real</p>
            <div
              className="rounded-xl overflow-hidden border border-dark-border/60"
              style={{
                width: aspectRatio === "16:9" ? 480 : aspectRatio === "1:1" ? 320 : 240,
                height: aspectRatio === "16:9" ? 270 : aspectRatio === "1:1" ? 320 : 426,
              }}
            >
              <Player
                component={VideoComposition}
                inputProps={compositionProps}
                durationInFrames={durationInFrames}
                compositionWidth={dimensions.width}
                compositionHeight={dimensions.height}
                fps={fps}
                controls
                style={{ width: "100%", height: "100%" }}
                autoPlay={false}
              />
            </div>
            <p className="text-[10px] text-text-secondary/40 text-center max-w-[280px]">
              Use play/pause para visualizar. O vídeo final terá resolução {dimensions.width}×{dimensions.height}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-text-secondary/60">{label}</span>
      <span className="text-text-primary font-medium text-right">{value}</span>
    </div>
  );
}
