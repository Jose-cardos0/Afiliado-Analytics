/** Custos e packs Afiliado Coins (Gerador de Especialista + Kiwify). */

export const AFILIADO_COINS_IMAGE_COST = 30;
export const AFILIADO_COINS_VIDEO_COST = 70;
/** Crédito mensal automático — Pro (calendário UTC, ver RPC `ensure_afiliado_monthly_pro_coins`). */
export const AFILIADO_COINS_MONTHLY_PRO = 100;
/** Staff recebe este valor por mês UTC na mesma função SQL. */
export const AFILIADO_COINS_MONTHLY_STAFF = 1000;

export type AfiliadoCoinsPack = {
  coins: number;
  checkoutUrl: string;
  priceLabel: string;
};

export const AFILIADO_COINS_PACKS: AfiliadoCoinsPack[] = [
  { coins: 100, checkoutUrl: "https://pay.kiwify.com.br/bkPvMEa", priceLabel: "R$ 12" },
  { coins: 300, checkoutUrl: "https://pay.kiwify.com.br/xRCi6UB", priceLabel: "R$ 36" },
  { coins: 800, checkoutUrl: "https://pay.kiwify.com.br/zUjcXsG", priceLabel: "R$ 96" },
  { coins: 1500, checkoutUrl: "https://pay.kiwify.com.br/d8VevfX", priceLabel: "R$ 180" },
  { coins: 3500, checkoutUrl: "https://pay.kiwify.com.br/pLNfiLh", priceLabel: "R$ 400" },
  { coins: 10000, checkoutUrl: "https://pay.kiwify.com.br/q6sCIdX", priceLabel: "R$ 999" },
];
