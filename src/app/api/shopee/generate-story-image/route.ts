/**
 * Gera imagem para Story (9:16) com Grok Imagine (xAI), a partir da imagem do produto + nome.
 * Use GROK_API_KEY ou XAI_API_KEY no .env.local.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const XAI_IMAGES_EDIT = "https://api.x.ai/v1/images/edits";
const MODEL = "grok-imagine-image";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Chave da API Grok não configurada. Adicione GROK_API_KEY no .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const productName = String(body?.productName ?? "").trim();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl é obrigatório" }, { status: 400 });
    }

    const prompt =
      productName.trim().length > 0
        ? `Transform this product image into an attractive vertical Instagram story format (promotional style). Product: "${productName}". Keep the product visible and appealing, suitable for social media advertising. Professional, clean layout.`
        : `Transform this product image into an attractive vertical Instagram story format (9:16), promotional style. Keep the product visible and appealing for social media.`;

    const res = await fetch(XAI_IMAGES_EDIT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        image: {
          url: imageUrl,
          type: "image_url",
        },
        aspect_ratio: "9:16",
        response_format: "b64_json",
      }),
    });

    const data = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = data?.error?.message ?? `xAI API error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const first = data?.data?.[0];
    if (!first) {
      return NextResponse.json({ error: "Resposta sem imagem" }, { status: 500 });
    }

    const b64 = first.b64_json ?? first.url;
    if (!b64) {
      return NextResponse.json({ error: "Imagem não retornada" }, { status: 500 });
    }

    if (typeof b64 === "string" && !b64.startsWith("http")) {
      return NextResponse.json({ imageBase64: b64, imageUrl: first.url ?? null });
    }

    return NextResponse.json({ imageUrl: first.url ?? b64, imageBase64: null });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar imagem" },
      { status: 500 }
    );
  }
}
