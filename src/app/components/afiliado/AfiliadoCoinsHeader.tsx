"use client";

import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, X } from "lucide-react";
import {
  AFILIADO_COINS_IMAGE_COST,
  AFILIADO_COINS_MONTHLY_PRO,
  AFILIADO_COINS_MONTHLY_STAFF,
  AFILIADO_COINS_PACKS,
  AFILIADO_COINS_VIDEO_COST,
} from "@/lib/afiliado-coins";

export default function AfiliadoCoinsHeader({
  balance,
  loading,
  onRefresh,
}: {
  balance: number | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [shopOpen, setShopOpen] = useState(false);

  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShopOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shopOpen]);

  const display =
    loading && balance === null ? "…" : balance == null ? "—" : balance;

  const handleOpened = useCallback(() => {
    onRefresh();
    setShopOpen(true);
  }, [onRefresh]);

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-dark-border bg-dark-bg/90 px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-sm">
        <Coins
          className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0"
          aria-hidden
        />
        <span className="hidden sm:inline text-[10px] sm:text-xs font-semibold text-text-secondary whitespace-nowrap">
          Afiliado Coins
        </span>
        <span className="text-[11px] sm:text-xs font-bold text-shopee-orange tabular-nums min-w-[2ch]">
          {display}
        </span>
        <button
          type="button"
          onClick={handleOpened}
          className="ml-0.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg border border-shopee-orange/40 bg-shopee-orange/15 text-shopee-orange hover:bg-shopee-orange/25 transition shrink-0"
          aria-label="Comprar mais Afiliado Coins"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {shopOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Fechar"
            onClick={() => setShopOpen(false)}
          />
          <div
            role="dialog"
            aria-labelledby="afiliado-coins-shop-title"
            className="relative w-full max-w-md rounded-2xl border border-dark-border bg-dark-card shadow-2xl max-h-[min(90vh,520px)] overflow-y-auto"
          >
            <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-dark-border bg-dark-card px-4 py-3">
              <div>
                <h2
                  id="afiliado-coins-shop-title"
                  className="text-sm font-bold text-text-primary"
                >
                  Afiliado Coins
                </h2>
                <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                  Imagem: {AFILIADO_COINS_IMAGE_COST} coins · Vídeo:{" "}
                  {AFILIADO_COINS_VIDEO_COST} coins · Pro: +
                  {AFILIADO_COINS_MONTHLY_PRO} · Staff: +
                  {AFILIADO_COINS_MONTHLY_STAFF} coins/mês (UTC)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="p-2 rounded-lg text-text-secondary hover:bg-white/5 hover:text-text-primary transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="p-3 space-y-2">
              {AFILIADO_COINS_PACKS.map((p) => (
                <li key={p.coins}>
                  <a
                    href={p.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-dark-border bg-dark-bg/50 px-3 py-2.5 hover:border-shopee-orange/45 hover:bg-shopee-orange/5 transition"
                  >
                    <span className="text-sm font-semibold text-text-primary">
                      {p.coins.toLocaleString("pt-BR")} coins
                    </span>
                    <span className="text-xs font-bold text-shopee-orange shrink-0">
                      {p.priceLabel}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="px-4 pb-4 text-[10px] text-text-secondary/80 leading-relaxed">
              Após o pagamento na Kiwify, os coins são creditados automaticamente
              na tua conta (pode levar alguns minutos).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
