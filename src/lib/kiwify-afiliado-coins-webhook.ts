import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  normalizeKiwifyCheckoutSlug,
  resolveAfiliadoCoinsFromKiwifyCheckout,
  resolveTierFromKiwifyIds,
} from "@/lib/kiwify-plan-catalog";
import { sendKiwifySetupEmail } from "@/lib/kiwify-send-setup-email";

type KiwifyCustomer = { email?: string; full_name?: string; first_name?: string };
type KiwifyProduct = { product_id?: string | number; product_name?: string };
type KiwifyOrder = { id?: string | number };

export type KiwifyCoinsPayload = Record<string, unknown> & {
  Customer?: KiwifyCustomer;
  Product?: KiwifyProduct;
  Order?: KiwifyOrder;
  checkout_link?: string;
  order_id?: string | number;
  id?: string | number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return typeof error === "string" ? error : JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function orderKeyFromData(data: KiwifyCoinsPayload): string {
  if (data.order_id != null) return String(data.order_id).trim();
  if (data.Order && typeof data.Order === "object" && data.Order.id != null) {
    return String(data.Order.id).trim();
  }
  if (data.id != null) return String(data.id).trim();
  return "";
}

/**
 * Só Afiliado Coins: não grava `subscriptions`, não altera plan_tier / subscription_status de quem já existe.
 */
export async function respondAfiliadoCoinsKiwifyApproved(
  supabase: SupabaseClient,
  data: KiwifyCoinsPayload,
  eventType: string
): Promise<NextResponse> {
  const customer = data.Customer;
  if (!customer?.email) {
    return NextResponse.json({ error: "Email do cliente ausente." }, { status: 400 });
  }

  const email = String(customer.email);
  const fullName = String(customer.full_name || customer.first_name || "Cliente");
  const product = data.Product;
  const planName = (product?.product_name && String(product.product_name).trim()) || "Afiliado Coins";
  const productId = String(product?.product_id || "");

  const checkoutRaw =
    typeof data.checkout_link === "string" ? data.checkout_link.trim() : "";
  const checkoutLink = checkoutRaw ? normalizeKiwifyCheckoutSlug(checkoutRaw) || null : null;
  const coinPack = resolveAfiliadoCoinsFromKiwifyCheckout(checkoutLink);
  const orderKey = orderKeyFromData(data);

  const afiliadoCoinsPayload: {
    checkout_slug: string | null;
    resolved_pack: number;
    order_id: string | null;
    credit_attempted: boolean;
    credit_ok: boolean | null;
    rpc_result?: unknown;
    rpc_error?: string;
    hint?: string;
  } = {
    checkout_slug: checkoutLink,
    resolved_pack: coinPack,
    order_id: orderKey || null,
    credit_attempted: false,
    credit_ok: null,
  };

  if (coinPack <= 0) {
    afiliadoCoinsPayload.hint = checkoutLink ? "checkout_slug_not_in_catalog" : "no_checkout_link";
    return NextResponse.json(
      {
        ok: false,
        error: "not_afiliado_coins_checkout",
        event: eventType,
        afiliado_coins: afiliadoCoinsPayload,
      },
      { status: 400 }
    );
  }

  if (!orderKey) {
    afiliadoCoinsPayload.hint = "missing_order_id";
    return NextResponse.json(
      {
        ok: false,
        error: "order_id_required",
        event: eventType,
        afiliado_coins: afiliadoCoinsPayload,
      },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();

  let userId: string | null = existing?.id ?? null;
  let isNewUser = false;

  if (!userId) {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createErr || !created?.user?.id) {
      return NextResponse.json(
        {
          error: `Falha ao criar usuário no Auth: ${createErr?.message || "desconhecido"}`,
        },
        { status: 500 }
      );
    }

    userId = created.user.id;
    isNewUser = true;

    const initialTier = resolveTierFromKiwifyIds({
      checkoutLink,
      planId: null,
      productId,
    });

    const { error: profErr } = await supabase.from("profiles").insert([
      {
        id: userId,
        email,
        subscription_status: "active",
        plan_name: planName,
        plan_tier: initialTier,
        account_setup_pending: true,
      },
    ]);
    if (profErr) {
      return NextResponse.json({ error: `Falha ao inserir profile: ${profErr.message}` }, { status: 500 });
    }
  }

  afiliadoCoinsPayload.credit_attempted = true;
  const { data: coinRpcData, error: coinErr } = await supabase.rpc("credit_afiliado_coins_kiwify", {
    p_user_id: userId,
    p_order_id: orderKey,
    p_coins: coinPack,
  });

  if (coinErr) {
    afiliadoCoinsPayload.credit_ok = false;
    afiliadoCoinsPayload.rpc_error = coinErr.message;
    console.error("[kiwify] afiliado_coins credit:", coinErr.message);
    return NextResponse.json(
      {
        ok: false,
        event: eventType,
        error: "afiliado_coins_credit_failed",
        message: coinErr.message,
        afiliado_coins: afiliadoCoinsPayload,
      },
      { status: 500 }
    );
  }

  afiliadoCoinsPayload.credit_ok = true;
  afiliadoCoinsPayload.rpc_result = coinRpcData ?? null;

  if (isNewUser) {
    const rawBaseUrl = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_BASE_URL;
    if (!rawBaseUrl) {
      return NextResponse.json(
        { error: "BASE_URL (SITE_URL ou NEXT_PUBLIC_BASE_URL) não configurada." },
        { status: 500 }
      );
    }

    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${baseUrl}/password-reset` },
    } as const);

    if (linkErr || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkErr?.message || "Falha ao gerar link de definição de senha" },
        { status: 500 }
      );
    }

    const actionLink = linkData.properties.action_link;
    const u = new URL(actionLink);
    const tokenFromUrl = u.searchParams.get("token");
    const linkType = u.searchParams.get("type");
    // @ts-expect-error versão do client
    const tokenFromProps: string | undefined = linkData.properties?.hashed_token || linkData.properties?.hashedToken;
    const tokenHash = tokenFromProps || tokenFromUrl;

    if (!tokenHash || linkType !== "recovery") {
      return NextResponse.json({ error: "Link inválido gerado (recovery)." }, { status: 500 });
    }

    const resetUrl =
      `${baseUrl}/password-reset` + `?type=recovery` + `&token_hash=${encodeURIComponent(tokenHash)}`;

    try {
      await sendKiwifySetupEmail(email, fullName, resetUrl);
    } catch (e: unknown) {
      const warn = getErrorMessage(e);
      return NextResponse.json({
        ok: true,
        event: eventType,
        mode: "afiliado_coins_only",
        warn: `Coins creditados, mas falha ao enviar e-mail: ${warn}`,
        afiliado_coins: afiliadoCoinsPayload,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    event: eventType,
    mode: "afiliado_coins_only",
    afiliado_coins: afiliadoCoinsPayload,
  });
}
