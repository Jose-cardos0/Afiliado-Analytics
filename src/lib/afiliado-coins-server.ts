import type { SupabaseClient } from "@supabase/supabase-js";

type RpcConsumeResult = { ok?: boolean; balance?: number; error?: string };

export async function ensureAfiliadoMonthlyProCoins(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc("ensure_afiliado_monthly_pro_coins", {
    p_user_id: userId,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function consumeAfiliadoCoins(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
): Promise<{ ok: boolean; balance?: number }> {
  const { data, error } = await supabase.rpc("consume_afiliado_coins", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) return { ok: false };
  const j = data as RpcConsumeResult | null;
  return { ok: j?.ok === true, balance: typeof j?.balance === "number" ? j.balance : undefined };
}

export async function refundAfiliadoCoins(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc("refund_afiliado_coins", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) console.error("[afiliado-coins] refund failed", error.message);
}
