/**
 * Limites de espelhamento alinhados a Grupos de Venda (campanhas ativas + conflito destino).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEntitlementsForUser, getUsageSnapshot } from "./plan-server";

export function normalizeGroupJid(jid: string): string {
  return jid.trim().toLowerCase();
}

/** Grupo destino não pode ser o mesmo JID de um grupo já usado por disparo contínuo ativo. */
export async function assertEspelhamentoDestinationNotBlockedByContinuo(
  supabase: SupabaseClient,
  userId: string,
  destinationGroupJid: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const dest = normalizeGroupJid(destinationGroupJid);
  const { data: continuos } = await supabase
    .from("grupos_venda_continuo")
    .select("lista_id")
    .eq("user_id", userId)
    .eq("ativo", true);
  const listaIds = [...new Set((continuos ?? []).map((c: { lista_id: string | null }) => c.lista_id).filter(Boolean))] as string[];
  if (listaIds.length === 0) return { ok: true };
  const { data: grps } = await supabase
    .from("grupos_venda")
    .select("group_id")
    .eq("user_id", userId)
    .in("lista_id", listaIds);
  const blocked = new Set(
    (grps ?? []).map((g: { group_id: string }) => normalizeGroupJid(g.group_id))
  );
  if (blocked.has(dest)) {
    return {
      ok: false,
      message:
        "Este grupo destino já está em uma lista usada por uma automação de Grupos de Venda ativa. Pause a automação ou escolha outro grupo.",
    };
  }
  return { ok: true };
}

/**
 * Ao ligar `ativo`, conta como +1 automação junto com `grupos_venda_continuo` ativos.
 */
export async function assertEspelhamentoAutomationSlot(
  supabase: SupabaseClient,
  userId: string,
  opts: { turningActive: boolean; wasAlreadyActive: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!opts.turningActive) return { ok: true };
  const ent = await getEntitlementsForUser(supabase, userId);
  const usage = await getUsageSnapshot(supabase, userId);
  const maxCamp = ent.gruposVenda.maxActiveCampaigns;
  const { count } = await supabase
    .from("espelhamento_config")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("ativo", true);
  const nEsp = count ?? 0;
  const increment = opts.wasAlreadyActive ? 0 : 1;
  if (usage.activeCampaigns + nEsp + increment > maxCamp) {
    return {
      ok: false,
      message: `Limite de ${maxCamp} automação(ões) ativa(s) (Grupos de Venda + Espelhamento). Pause uma para ativar outra.`,
    };
  }
  return { ok: true };
}
