/**
 * Gerar áudio com ElevenLabs TTS.
 * POST { text, voiceId } → binary audio (mp3)
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY || "sk_ee8e7c34a6083c306e7840b42cfcc65d6748619bed210fa0";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    const voiceId = String(body?.voiceId ?? "").trim();

    if (!text) return NextResponse.json({ error: "text é obrigatório" }, { status: 400 });
    if (!voiceId) return NextResponse.json({ error: "voiceId é obrigatório" }, { status: 400 });

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `ElevenLabs ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline; filename=tts.mp3",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar áudio" },
      { status: 500 }
    );
  }
}
