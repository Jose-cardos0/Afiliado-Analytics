/**
 * Proxy de imagem para evitar CORS ao compartilhar no WhatsApp (Web Share API).
 * Só aceita URLs da Shopee (cdn.shopee, shopee, etc.).
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = ["shopee.com.br", "shopee.com", "cdn.shopee.com", "cf.shopee.com", "img.ltwebstatic.com"];

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url || !isAllowedUrl(url)) {
      return NextResponse.json({ error: "URL inválida ou não permitida" }, { status: 400 });
    }
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ShopeeAffiliate/1.0)" } });
    if (!res.ok) return NextResponse.json({ error: "Falha ao buscar imagem" }, { status: 502 });
    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Erro no proxy de imagem" }, { status: 500 });
  }
}
