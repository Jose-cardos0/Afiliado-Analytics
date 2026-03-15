/**
 * Lista vozes disponíveis no ElevenLabs.
 * GET → { voices: [{ voice_id, name, preview_url, labels }] }
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_ee8e7c34a6083c306e7840b42cfcc65d6748619bed210fa0";

export async function GET() {
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": ELEVEN_API_KEY },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `ElevenLabs ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const voices = (json?.voices ?? []).map(
      (v: { voice_id: string; name: string; preview_url?: string; labels?: Record<string, string> }) => ({
        voice_id: v.voice_id,
        name: v.name,
        preview_url: v.preview_url ?? null,
        labels: v.labels ?? {},
      })
    );

    return NextResponse.json({ voices });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar vozes" },
      { status: 500 }
    );
  }
}
