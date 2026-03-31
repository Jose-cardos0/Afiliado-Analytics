import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (isProd) {
    const auth = req.headers.get("authorization") || "";
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return new Response("Supabase env vars ausentes.", { status: 500 });
  }

  const supabase = createClient(url, serviceKey);

  // Defaults conservadores: manter 48h de logs e no máximo 10k linhas globais.
  const retentionHours = parsePositiveInt(process.env.ESPELHAMENTO_PAYLOAD_RETENTION_HOURS, 48);
  const maxRows = parsePositiveInt(process.env.ESPELHAMENTO_PAYLOAD_MAX_ROWS, 10000);

  const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000).toISOString();
  let deletedByAge = 0;
  let deletedByCap = 0;

  const { data: oldRows, error: oldErr } = await supabase
    .from("espelhamento_payloads")
    .select("id")
    .lt("created_at", cutoffDate)
    .limit(20000);
  if (oldErr) return new Response(`Erro ao listar antigos: ${oldErr.message}`, { status: 500 });
  if ((oldRows ?? []).length > 0) {
    const ids = (oldRows ?? []).map((r: { id: string }) => r.id);
    const { error: delOldErr } = await supabase.from("espelhamento_payloads").delete().in("id", ids);
    if (delOldErr) return new Response(`Erro ao apagar antigos: ${delOldErr.message}`, { status: 500 });
    deletedByAge = ids.length;
  }

  // Limite por volume (mantém as mais recentes).
  const { data: allRecent, error: capErr } = await supabase
    .from("espelhamento_payloads")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(maxRows + 5000);
  if (capErr) return new Response(`Erro ao listar para cap: ${capErr.message}`, { status: 500 });
  const idsToDrop = (allRecent ?? []).slice(maxRows).map((r: { id: string }) => r.id);
  if (idsToDrop.length > 0) {
    const { error: delCapErr } = await supabase.from("espelhamento_payloads").delete().in("id", idsToDrop);
    if (delCapErr) return new Response(`Erro ao apagar excedente: ${delCapErr.message}`, { status: 500 });
    deletedByCap = idsToDrop.length;
  }

  return Response.json({
    ok: true,
    retentionHours,
    maxRows,
    deletedByAge,
    deletedByCap,
    cutoffDate,
  });
}

