/**
 * Gera copy de venda com Grok (xAI) para usar como narração/legenda em vídeo.
 * POST { productName, style? } → { copy }
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GROK_API = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-4.20-beta-latest-non-reasoning";

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
    const productName = String(body?.productName ?? "").trim();
    const style = String(body?.style ?? "vendas").trim();

    if (!productName) {
      return NextResponse.json({ error: "productName é obrigatório" }, { status: 400 });
    }

    const systemPrompt = `Você é um copywriter expert em e-commerce e vídeos de venda para redes sociais. Gere uma narração/copy em português do Brasil.
Regras:
- Tom direto, urgência, escassez e benefícios do produto.
- Linguagem falada, como se fosse uma narração de vídeo curto (30-60s).
- Frases curtas e impactantes para manter a atenção.
- NÃO inclua preço nem link.
- Máximo 200 palavras.
- Responda APENAS com o texto da narração, sem títulos ou explicações extras.`;

    const userPrompt = style === "humor"
      ? `Gere uma narração engraçada e viral para vídeo de venda deste produto: "${productName}".`
      : style === "urgencia"
        ? `Gere uma narração com muita urgência e escassez para vídeo de venda deste produto: "${productName}".`
        : `Gere uma narração de venda persuasiva para vídeo curto deste produto: "${productName}".`;

    const res = await fetch(GROK_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Grok ${res.status}: ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const copy = json?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!copy) {
      return NextResponse.json({ error: "Resposta vazia do Grok" }, { status: 502 });
    }

    return NextResponse.json({ copy });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao gerar copy" },
      { status: 500 }
    );
  }
}
