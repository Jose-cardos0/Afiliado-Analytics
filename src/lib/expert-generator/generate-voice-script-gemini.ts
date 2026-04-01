/**
 * Roteiro falado para Veo — texto via Gemini (GEMINI_API_KEY), modelo só texto.
 * `gemini-2.0-flash` deixou de estar disponível para contas novas; usamos 2.5 por defeito.
 */

export type VoiceScriptGeminiResult =
  | { ok: true; script: string; modelUsed: string }
  | { ok: false; error: string; detail?: string };

type GeminiTextResponse = {
  error?: { message?: string; code?: number; status?: string };
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

const DEFAULT_TEXT_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
] as const;

function extractText(json: GeminiTextResponse): string | null {
  const parts = json.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  const t = parts.map((p) => p.text ?? "").join("").trim();
  return t || null;
}

function buildPrompt(params: {
  productBrief: string;
  durationSeconds: 4 | 6 | 8;
  motionSummary: string;
  voiceGender: "female" | "male";
}): string {
  const wordHint =
    params.durationSeconds === 4
      ? "cerca de 35–55 palavras"
      : params.durationSeconds === 6
        ? "cerca de 55–80 palavras"
        : "cerca de 80–110 palavras";

  const genderPt =
    params.voiceGender === "female"
      ? "voz feminina, tom natural de influencer"
      : "voz masculina, tom natural de influencer";

  return `És copywriter para vídeos curtos verticais (UGC / direct response) em português do Brasil.

O vídeo tem EXATAMENTE ${params.durationSeconds} segundos de duração. O texto falado deve caber nesse tempo ao ser lido em voz natural (nem muito lento nem corrido): ${wordHint}.

Produto (descrição breve do anunciante):
${params.productBrief.trim()}

Contexto de movimento/cena do vídeo (se útil):
${params.motionSummary.trim() || "(não especificado)"}

Escreve APENAS o texto que a pessoa vai FALAR em voz alta — primeira pessoa, conversacional, convincente, sem saudações genéricas longas, sem indicações de encenação entre parênteses, sem numeração, sem título.
Tom: ${genderPt}.
Não menciones duração, segundos, "este vídeo" ou a palavra "roteiro".
Responde só com o monólogo, uma única sequência de frases.`;
}

async function generateOnce(
  model: string,
  apiKey: string,
  prompt: string
): Promise<VoiceScriptGeminiResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1024,
      },
    }),
  });

  const raw = await res.text();
  let json: GeminiTextResponse;
  try {
    json = JSON.parse(raw) as GeminiTextResponse;
  } catch {
    return {
      ok: false,
      error: "Resposta inválida do Gemini (não é JSON).",
      detail: raw.slice(0, 400),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: json.error?.message ?? `HTTP ${res.status} ao gerar roteiro.`,
      detail: raw.slice(0, 500),
    };
  }

  const script = extractText(json);
  if (!script) {
    return {
      ok: false,
      error: "O Gemini não devolveu texto utilizável.",
      detail: raw.slice(0, 600),
    };
  }

  return { ok: true, script, modelUsed: model };
}

function isModelNotFound(r: VoiceScriptGeminiResult): boolean {
  if (r.ok) return false;
  const m = `${r.error}\n${r.detail ?? ""}`;
  return /404|NOT_FOUND|no longer available|not found/i.test(m);
}

export async function generateVoiceScriptWithGemini(params: {
  productBrief: string;
  durationSeconds: 4 | 6 | 8;
  motionSummary: string;
  voiceGender: "female" | "male";
}): Promise<VoiceScriptGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "GEMINI_API_KEY não configurada (necessária para gerar roteiro com IA).",
    };
  }

  const envModel = process.env.GEMINI_TEXT_MODEL?.trim();
  const prompt = buildPrompt(params);

  const ordered: string[] = envModel
    ? [
        envModel,
        ...DEFAULT_TEXT_MODEL_CANDIDATES.filter((m) => m !== envModel),
      ]
    : [...DEFAULT_TEXT_MODEL_CANDIDATES];

  const errors: string[] = [];
  for (const model of ordered) {
    const result = await generateOnce(model, apiKey, prompt);
    if (result.ok) return result;

    errors.push(`[${model}] ${result.error}`);
    if (
      /API key not valid|invalid api key|PERMISSION_DENIED/i.test(result.error)
    ) {
      return result;
    }
    if (!isModelNotFound(result)) {
      return result;
    }
  }

  return {
    ok: false,
    error:
      "Nenhum modelo Gemini texto respondeu. Defina GEMINI_TEXT_MODEL (ex.: gemini-2.5-flash) ou verifique a chave.",
    detail: errors.join("\n"),
  };
}
