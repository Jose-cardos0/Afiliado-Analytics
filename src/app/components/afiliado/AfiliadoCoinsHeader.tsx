"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Coins, Plus, X } from "lucide-react";
import type { AfiliadoCoinsPack } from "@/lib/afiliado-coins";
import {
  AFILIADO_COINS_IMAGE_COST,
  AFILIADO_COINS_MONTHLY_PRO,
  AFILIADO_COINS_MONTHLY_STAFF,
  AFILIADO_COINS_PACKS,
  AFILIADO_COINS_VIDEO_COST,
} from "@/lib/afiliado-coins";

/** Arte em `public/coins/` — nome do ficheiro por quantidade de coins. */
const PACK_IMAGE_SRC: Record<number, string> = {
  100: "/coins/100coins.png",
  300: "/coins/300coins.png",
  800: "/coins/800coins.png",
  1500: "/coins/1500coins.png",
  3500: "/coins/3500coins.png",
  10000: "/coins/10000coins.png",
};

const DESKTOP_PAGE_SIZE = 3;
const DESKTOP_PAGE_COUNT = Math.ceil(
  AFILIADO_COINS_PACKS.length / DESKTOP_PAGE_SIZE
);

function discountLabelForPack(coins: number): string | undefined {
  if (coins === 3500) return "5% OFF";
  if (coins === 10000) return "17% OFF";
  return undefined;
}

function mobileCardScrollStep(el: HTMLElement): number {
  const li = el.querySelector("li");
  const gap =
    Number.parseFloat(getComputedStyle(el).columnGap || "0") ||
    Number.parseFloat(getComputedStyle(el).gap || "12") ||
    12;
  if (li) {
    return li.getBoundingClientRect().width + gap;
  }
  return Math.max(120, el.clientWidth * 0.82);
}

function CoinPackCard({
  pack,
  priority,
  discountLabel,
}: {
  pack: AfiliadoCoinsPack;
  priority?: boolean;
  discountLabel?: string;
}) {
  const imgSrc = PACK_IMAGE_SRC[pack.coins] ?? "/coins/100coins.png";
  return (
    <a
      href={pack.checkoutUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group flex flex-col h-full rounded-2xl overflow-hidden
        border border-dark-border bg-gradient-to-b from-dark-bg/80 to-dark-bg
        shadow-[0_8px_32px_rgba(0,0,0,0.35)]
        ring-1 ring-white/[0.04]
        transition-all duration-200
        hover:border-shopee-orange/50 hover:ring-shopee-orange/15
        hover:shadow-[0_12px_40px_rgba(238,77,45,0.12)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shopee-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card
      "
    >
      <div className="relative aspect-[4/3] w-full bg-black/40 overflow-hidden">
        <Image
          src={imgSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 82vw, 28vw"
          className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          priority={priority}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent opacity-90"
          aria-hidden
        />
        {discountLabel ? (
          <div
            className="pointer-events-none absolute left-0 top-2 z-[15] sm:top-3"
            role="presentation"
          >
            <span
              className="
                inline-block max-w-[calc(100%-0.5rem)] bg-shopee-orange text-white
                text-[9px] sm:text-[10px] font-extrabold uppercase leading-tight tracking-wide
                pl-2 pr-2.5 py-1 rounded-r-md
                shadow-[2px_3px_10px_rgba(0,0,0,0.4)]
                border border-white/25 border-l-0
              "
            >
              {discountLabel}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col flex-1 gap-1 px-3 pt-2.5 pb-3">
        <span className="text-lg font-bold text-text-primary tabular-nums">
          {pack.coins.toLocaleString("pt-BR")}{" "}
          <span className="text-sm font-semibold text-text-secondary">coins</span>
        </span>
        <span className="text-sm font-bold text-shopee-orange">{pack.priceLabel}</span>
        <span className="mt-1 text-[11px] font-medium text-shopee-orange/90 group-hover:text-shopee-orange transition-colors">
          Comprar Agora →
        </span>
      </div>
    </a>
  );
}

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
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShopOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shopOpen]);

  useLayoutEffect(() => {
    if (!shopOpen) return;
    const d = desktopScrollRef.current;
    if (d) d.scrollLeft = 0;
    const m = mobileScrollRef.current;
    if (m) m.scrollLeft = 0;
  }, [shopOpen]);

  const display =
    loading && balance === null ? "…" : balance == null ? "—" : balance;

  const handleOpened = useCallback(() => {
    onRefresh();
    setShopOpen(true);
  }, [onRefresh]);

  const desktopPages = Array.from({ length: DESKTOP_PAGE_COUNT }, (_, i) =>
    AFILIADO_COINS_PACKS.slice(
      i * DESKTOP_PAGE_SIZE,
      i * DESKTOP_PAGE_SIZE + DESKTOP_PAGE_SIZE
    )
  );

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
            className="relative w-full max-w-[min(96vw,56rem)] overflow-visible"
          >
            {/* Cutout estilo mockup: sai por cima do cartão (PNG com fundo transparente). */}
            <div
              className="pointer-events-none absolute left-0 sm:left-1 z-[60] -top-[3rem] max-sm:scale-[0.92] sm:-top-[5.25rem] w-[min(46vw,152px)] h-[min(54vw,190px)] sm:w-[188px] sm:h-[248px] max-sm:origin-bottom-left"
              aria-hidden
            >
              <Image
                src="/coins/espcoins.png"
                alt=""
                fill
                className="object-contain object-left-bottom drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
                sizes="(max-width: 640px) 46vw, 188px"
                priority
              />
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-dark-border bg-dark-card shadow-2xl max-h-[min(92vh,720px)]">
            <div className="relative z-10 shrink-0 flex items-start justify-between gap-2 border-b border-dark-border bg-dark-card px-4 py-3.5 pl-[min(42vw,7.25rem)] sm:pl-44">
              <div className="min-w-0">
                <h2
                  id="afiliado-coins-shop-title"
                  className="text-base font-bold text-text-primary tracking-tight"
                >
                  Afiliado Coins
                </h2>
                <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                  Preços e benefícios!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShopOpen(false)}
                className="relative z-[70] p-2 rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary transition shrink-0"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
              <p className="sm:hidden px-4 pt-3 text-[10px] text-text-secondary/70 text-center">
                Usa as setas ou desliza para ver todos os pacotes
              </p>
              <p className="hidden sm:block px-4 pt-3 text-[10px] text-text-secondary/70 text-center">
                Usa as setas sobre os cards para mudar de página!
              </p>

              {/* Mobile: fila horizontal + setas laranja (igual ideia ao desktop) */}
              <div className="relative sm:hidden pb-3">
                <ul
                  ref={mobileScrollRef}
                  className="
                    flex gap-3 p-3
                    overflow-x-auto snap-x snap-mandatory scroll-smooth
                    [-ms-overflow-style:none] [scrollbar-width:none]
                    [&::-webkit-scrollbar]:hidden
                  "
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {AFILIADO_COINS_PACKS.map((p, i) => (
                    <li
                      key={p.coins}
                      className="shrink-0 snap-center w-[min(82vw,260px)] max-w-[260px]"
                    >
                      <CoinPackCard
                        pack={p}
                        priority={i <= 1}
                        discountLabel={discountLabelForPack(p.coins)}
                      />
                    </li>
                  ))}
                </ul>

                {AFILIADO_COINS_PACKS.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Pacote anterior"
                      className="
                        absolute left-1 top-1/2 z-20 -translate-y-1/2
                        flex h-11 w-11 touch-manipulation items-center justify-center rounded-full
                        border border-white/20 bg-shopee-orange text-white
                        shadow-[0_6px_24px_rgba(238,77,45,0.45)]
                        transition active:scale-[0.96]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card
                      "
                      onClick={() => {
                        const el = mobileScrollRef.current;
                        if (!el) return;
                        const step = mobileCardScrollStep(el);
                        el.scrollTo({
                          left: Math.max(0, el.scrollLeft - step),
                          behavior: "smooth",
                        });
                      }}
                    >
                      <ChevronLeft className="h-5 w-5 -ml-0.5" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      aria-label="Pacote seguinte"
                      className="
                        absolute right-1 top-1/2 z-20 -translate-y-1/2
                        flex h-11 w-11 touch-manipulation items-center justify-center rounded-full
                        border border-white/20 bg-shopee-orange text-white
                        shadow-[0_6px_24px_rgba(238,77,45,0.45)]
                        transition active:scale-[0.96]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card
                      "
                      onClick={() => {
                        const el = mobileScrollRef.current;
                        if (!el) return;
                        const step = mobileCardScrollStep(el);
                        const maxL = el.scrollWidth - el.clientWidth;
                        el.scrollTo({
                          left: Math.min(maxL, el.scrollLeft + step),
                          behavior: "smooth",
                        });
                      }}
                    >
                      <ChevronRight className="h-5 w-5 -mr-0.5" strokeWidth={2.5} />
                    </button>
                  </>
                ) : null}
              </div>

              {/* Desktop: carrossel com botões laranja por cima dos cards (voltar / avançar) */}
              <div className="relative hidden sm:block px-2 pb-3">
                <div
                  ref={desktopScrollRef}
                  className="
                    w-full overflow-x-auto snap-x snap-mandatory scroll-smooth
                    [-ms-overflow-style:none] [scrollbar-width:none]
                    [&::-webkit-scrollbar]:hidden
                  "
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div
                    className="flex"
                    style={{ width: `${DESKTOP_PAGE_COUNT * 100}%` }}
                  >
                    {desktopPages.map((pagePacks, pageIdx) => (
                      <ul
                        key={pageIdx}
                        className="grid grid-cols-3 gap-3 p-3 sm:p-4 box-border shrink-0 snap-start"
                        style={{ width: `${100 / DESKTOP_PAGE_COUNT}%` }}
                      >
                        {pagePacks.map((p, i) => (
                          <li key={p.coins} className="min-w-0">
                            <CoinPackCard
                              pack={p}
                              priority={pageIdx === 0 && i <= 1}
                              discountLabel={discountLabelForPack(p.coins)}
                            />
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>

                {DESKTOP_PAGE_COUNT > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Ver pacotes anteriores"
                      className="
                        absolute left-3 top-1/2 z-20 -translate-y-1/2
                        flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                        border border-white/20 bg-shopee-orange text-white
                        shadow-[0_6px_24px_rgba(238,77,45,0.45)]
                        transition hover:bg-shopee-orange/90 hover:scale-[1.05] active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card
                      "
                      onClick={() => {
                        const el = desktopScrollRef.current;
                        if (!el) return;
                        const w = el.clientWidth;
                        if (w < 1) return;
                        const i = Math.min(
                          DESKTOP_PAGE_COUNT - 1,
                          Math.max(0, Math.floor((el.scrollLeft + w * 0.35) / w))
                        );
                        const target = Math.max(0, i - 1);
                        el.scrollTo({
                          left: target * w,
                          behavior: "smooth",
                        });
                      }}
                    >
                      <ChevronLeft className="h-6 w-6 -ml-0.5" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      aria-label="Ver mais pacotes"
                      className="
                        absolute right-3 top-1/2 z-20 -translate-y-1/2
                        flex h-12 w-12 shrink-0 items-center justify-center rounded-full
                        border border-white/20 bg-shopee-orange text-white
                        shadow-[0_6px_24px_rgba(238,77,45,0.45)]
                        transition hover:bg-shopee-orange/90 hover:scale-[1.05] active:scale-[0.98]
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card
                      "
                      onClick={() => {
                        const el = desktopScrollRef.current;
                        if (!el) return;
                        const w = el.clientWidth;
                        if (w < 1) return;
                        const i = Math.min(
                          DESKTOP_PAGE_COUNT - 1,
                          Math.max(0, Math.floor((el.scrollLeft + w * 0.35) / w))
                        );
                        const target = Math.min(DESKTOP_PAGE_COUNT - 1, i + 1);
                        el.scrollTo({
                          left: target * w,
                          behavior: "smooth",
                        });
                      }}
                    >
                      <ChevronRight className="h-6 w-6 -mr-0.5" strokeWidth={2.5} />
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <p className="shrink-0 px-4 py-3 border-t border-dark-border/80 text-[10px] text-text-secondary/80 leading-relaxed bg-dark-bg/30">
              Após o pagamento na Kiwify, os coins são creditados automaticamente
              na tua conta (pode levar alguns minutos — atualiza a página para ver
              o saldo).
            </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
