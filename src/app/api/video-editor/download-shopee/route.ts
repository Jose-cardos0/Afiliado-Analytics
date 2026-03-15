import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VIDEO_RE = /\.(mp4|m3u8|webm|ts)(\?|$)/i;

function extractIds(url: string): boolean {
  return /i\.\d+\.\d+/.test(url) || /\/product\/\d+\/\d+/.test(url);
}

function runScraper(url: string): Promise<{ productName: string; media: { url: string; type: string; label: string }[]; error?: string }> {
  return new Promise((resolve) => {
    const cwd = process.cwd();
    const sep = process.platform === "win32" ? "\\" : "/";
    const scriptPath = [cwd, "scripts", "shopee-scraper.cjs"].join(sep);

    const child = spawn("node", [scriptPath, url], { timeout: 50000, stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    child.on("close", () => {
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ productName: "", media: [], error: stderr.slice(0, 300) || "Resposta inválida do scraper" });
      }
    });

    child.on("error", (err: Error) => {
      resolve({ productName: "", media: [], error: err.message });
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const shopeeUrl = String(body?.url ?? "").trim();
    const mode = String(body?.mode ?? "scrape");

    if (!shopeeUrl) {
      return NextResponse.json({ error: "URL é obrigatória" }, { status: 400 });
    }

    if (mode === "proxy") {
      try {
        const res = await fetch(shopeeUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (!res.ok) return NextResponse.json({ error: `Erro ${res.status}` }, { status: 502 });
        const buf = await res.arrayBuffer();
        const ct = res.headers.get("content-type") || "application/octet-stream";
        const isVideo = VIDEO_RE.test(shopeeUrl) || ct.includes("video");
        return new NextResponse(buf, {
          headers: { "Content-Type": ct, "X-Media-Type": isVideo ? "video" : "image" },
        });
      } catch {
        return NextResponse.json({ error: "Falha ao baixar mídia" }, { status: 502 });
      }
    }

    if (!extractIds(shopeeUrl)) {
      return NextResponse.json(
        { error: "URL inválida. Use: shopee.com.br/Produto-i.SHOPID.ITEMID" },
        { status: 400 }
      );
    }

    const result = await runScraper(shopeeUrl);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    if (!result.media || result.media.length === 0) {
      return NextResponse.json({ error: "Nenhuma mídia encontrada neste produto." }, { status: 404 });
    }

    return NextResponse.json({
      productName: result.productName,
      media: result.media,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao processar" },
      { status: 500 }
    );
  }
}
