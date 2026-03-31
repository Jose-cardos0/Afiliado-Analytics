import { assertVideoEditorPro } from "@/lib/gate-video-editor-request";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JAMENDO_BASE = "https://api.jamendo.com/v3.0/tracks";

const GENRE_MAP: Record<string, string> = {
  energetic: "energetic+upbeat",
  calm: "calm+ambient",
  happy: "happy+positive",
  dramatic: "dramatic+epic",
  chill: "chillout+lofi",
  lofi: "lofi+hiphop",
  corporate: "corporate+motivational",
  cinematic: "cinematic+orchestral",
};

type JamendoTrack = {
  id: string;
  name: string;
  artist_name: string;
  duration: number;
  audio: string;
  audiodownload: string;
  image: string;
};

type JamendoTracksResponse = {
  headers?: { status?: string; error_message?: string; code?: number };
  results?: JamendoTrack[];
};

export async function GET(req: Request) {
  try {
    const gate = await assertVideoEditorPro();
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const clientId = process.env.JAMENDO_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json({
        tracks: [],
        genre: searchParams.get("genre") || "energetic",
        total: 0,
        jamendoConfigured: false,
        message:
          "Biblioteca Jamendo não configurada. Defina JAMENDO_CLIENT_ID em .env.local ou envie um MP3.",
      });
    }
    const genre = searchParams.get("genre") || "energetic";
    const search = searchParams.get("search") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    const tags = GENRE_MAP[genre] || genre;

    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: String(limit),
      order: "popularity_total",
      audioformat: "mp32",
      include: "musicinfo",
    });

    if (search) {
      params.set("namesearch", search);
    } else {
      params.set("fuzzytags", tags);
    }

    const res = await fetch(`${JAMENDO_BASE}?${params}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Jamendo API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as JamendoTracksResponse;
    if (data.headers?.status === "failed") {
      return NextResponse.json(
        {
          error:
            data.headers.error_message ||
            "Jamendo rejeitou a requisição. Verifique se JAMENDO_CLIENT_ID é válido em developer.jamendo.com.",
          tracks: [],
          genre,
          total: 0,
        },
        { status: 502 }
      );
    }

    const tracks = (data.results ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artist_name,
      duration: t.duration,
      audioUrl: t.audio,
      downloadUrl: t.audiodownload,
      coverUrl: t.image,
    }));

    return NextResponse.json({
      tracks,
      genre,
      total: tracks.length,
      jamendoConfigured: true,
    });
  } catch (e) {
    console.error("[music-library]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar músicas" },
      { status: 500 }
    );
  }
}
