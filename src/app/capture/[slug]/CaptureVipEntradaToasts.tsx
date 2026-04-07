"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_NOTIFICATIONS_POSITION,
  type NotificationsPosition,
} from "@/lib/capture-notifications";
import { useCapturePreviewPortal } from "./CapturePreviewPortalContext";

/** Homens: só números, h1.webp, Jordan. */
const NOTIFI_MALE = [
  "/notifi/01.jpg",
  "/notifi/02.jpg",
  "/notifi/03.jpg",
  "/notifi/04.jpg",
  "/notifi/05.jpg",
  "/notifi/06.jpg",
  "/notifi/07.jpg",
  "/notifi/08.jpg",
  "/notifi/09.jpg",
  "/notifi/10.jpg",
  "/notifi/11.jpg",
  "/notifi/12.jpg",
  "/notifi/13.jpg",
  "/notifi/14.jpg",
  "/notifi/15.jpg",
  "/notifi/h1.webp",
  "/notifi/Jordan.jpg",
] as const;

/** Mulheres: w*, m*, nomes tipicamente femininos nos ficheiros. */
const NOTIFI_FEMALE = [
  "/notifi/w1.jpg",
  "/notifi/w2.jpg",
  "/notifi/w3.jpg",
  "/notifi/w4.jpg",
  "/notifi/w5.jpg",
  "/notifi/w6.jpg",
  "/notifi/w7.jpg",
  "/notifi/w9.jpg",
  "/notifi/w10.jpg",
  "/notifi/w11.jpg",
  "/notifi/w12.jpg",
  "/notifi/w13.jpg",
  "/notifi/w14.jpg",
  "/notifi/w15.jpg",
  "/notifi/w100.jpg",
  "/notifi/m1.jpg",
  "/notifi/m2.jpg",
  "/notifi/m3.jpg",
  "/notifi/m4.jpg",
  "/notifi/Jenifer.webp",
  "/notifi/Rachel.webp",
  "/notifi/Alyssa.webp",
  "/notifi/stephanie.webp",
  "/notifi/abigail.webp",
  "/notifi/samantha.webp",
  "/notifi/katherine.webp",
  "/notifi/victoria.webp",
] as const;

const FEMALE_NAMES = [
  "Ana",
  "Juliana",
  "Mariana",
  "Fernanda",
  "Beatriz",
  "Camila",
  "Larissa",
  "Patrícia",
  "Amanda",
  "Letícia",
  "Priscila",
  "Vanessa",
  "Renata",
  "Tatiane",
  "Daniela",
  "Aline",
  "Cristina",
  "Adriana",
  "Jenifer",
  "Rachel",
  "Alyssa",
  "Stephanie",
  "Abigail",
  "Samantha",
  "Katherine",
  "Victoria",
  "Bruna",
  "Luana",
  "Isabela",
  "Natália",
] as const;

const MALE_NAMES = [
  "Carlos",
  "Pedro",
  "Lucas",
  "Rafael",
  "Bruno",
  "Gabriel",
  "Diego",
  "Rodrigo",
  "Felipe",
  "Gustavo",
  "Thiago",
  "André",
  "Paulo",
  "Ricardo",
  "Marcelo",
  "Vinícius",
  "Fábio",
  "Eduardo",
  "Henrique",
  "Roberto",
  "Alexandre",
  "Jordan",
  "Leonardo",
  "Matheus",
  "Guilherme",
] as const;

const HOLD_VISIBLE_MS = 5000;
const GAP_AFTER_EXIT_MS = 2000;
const FIRST_DELAY_MS = 800;
const ENTER_ANIM_MS = 500;
const EXIT_ANIM_MS = 600;

function randomCouponPct(): number {
  return Math.floor(Math.random() * (60 - 30 + 1)) + 30;
}

function pick<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export type CaptureVipEntradaToastsProps = {
  /** Se `true`, não mostra toasts. */
  disabled?: boolean;
  /** @deprecated O ritmo é sequencial (5s visível + saída + 2s pausa); ignorado. */
  intervalMs?: number;
  /** @deprecated Uma notificação de cada vez; ignorado. */
  maxVisible?: number;
  /** @deprecated Usar HOLD_VISIBLE_MS interno; ignorado. */
  visibleMs?: number;
  /**
   * `default` — “entrou no grupo”.
   * `coupon` — só The New Chance: cupom X% Off.
   */
  variant?: "default" | "coupon";
  /** Onde o cartão aparece (viewport ou área do preview no dashboard). */
  position?: NotificationsPosition;
};

type ToastData = {
  id: number;
  name: string;
  avatarSrc: string;
  pct?: number;
};

type Phase = "enter" | "visible" | "exit";

function toastPositionLayerClasses(
  position: NotificationsPosition,
  dock: "preview" | "viewport",
): string {
  const mode = dock === "viewport" ? "fixed" : "absolute";
  const z = dock === "viewport" ? "z-[1002]" : "z-[10]";
  const base = `pointer-events-none ${mode} ${z}`;
  const topSafe =
    dock === "viewport"
      ? "top-[max(4.5rem,calc(env(safe-area-inset-top)+2.75rem))]"
      : "top-12 sm:top-14";
  const bottomPad =
    dock === "viewport"
      ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      : "pb-2";

  switch (position) {
    case "top_left":
      return `${base} inset-x-0 ${topSafe} flex max-w-full justify-start overflow-x-hidden pl-3 pt-1 sm:pl-4`;
    case "top_center":
      return `${base} inset-x-0 ${topSafe} flex max-w-full justify-center overflow-x-hidden px-3 pt-1`;
    case "top_right":
      return `${base} inset-x-0 ${topSafe} flex max-w-full justify-end overflow-x-hidden pr-3 pt-1 sm:pr-4`;
    case "bottom_left":
      return `${base} inset-x-0 bottom-0 flex max-w-full justify-start overflow-x-hidden pl-3 pt-2 ${bottomPad} sm:pl-4`;
    case "bottom_center":
      return `${base} inset-x-0 bottom-0 flex max-w-full justify-center overflow-x-hidden px-3 pt-2 ${bottomPad}`;
    case "bottom_right":
      return `${base} inset-x-0 bottom-0 flex max-w-full justify-end overflow-x-hidden pl-3 pt-2 pr-3 sm:pr-4 ${bottomPad}`;
    case "center":
      return `${base} inset-0 flex max-w-full items-center justify-center overflow-x-hidden p-3`;
    case "middle_left":
      return `${base} left-0 top-1/2 max-w-full -translate-y-1/2 flex justify-start overflow-x-hidden pl-3 sm:pl-4`;
    case "middle_right":
      return `${base} right-0 top-1/2 max-w-full -translate-y-1/2 flex justify-end overflow-x-hidden pr-3 sm:pr-4`;
    default:
      return `${base} inset-x-0 ${topSafe} flex max-w-full justify-end overflow-x-hidden pr-3 pt-1 sm:pr-4`;
  }
}

/**
 * Uma notificação de cada vez: entra da direita, fica 5s, desaparece com fade (sem sair pela esquerda), pausa 2s.
 */
export default function CaptureVipEntradaToasts({
  disabled = false,
  variant = "default",
  position = DEFAULT_NOTIFICATIONS_POSITION,
}: CaptureVipEntradaToastsProps) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const idRef = useRef(0);
  const previewPortal = useCapturePreviewPortal();

  /** Página pública: portal para `body`. Dashboard (preview): espera overlay e porta para lá — nunca para o body inteiro. */
  useLayoutEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const enterMs = reduceMotion ? 0 : ENTER_ANIM_MS;
    const exitMs = reduceMotion ? 0 : EXIT_ANIM_MS;

    const nextToast = (): ToastData => {
      const female = Math.random() < 0.5;
      const name = female ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
      const avatarSrc = (female ? pick(NOTIFI_FEMALE) : pick(NOTIFI_MALE)) as string;
      const pct = variant === "coupon" ? randomCouponPct() : undefined;
      return {
        id: ++idRef.current,
        name: String(name),
        avatarSrc,
        pct,
      };
    };

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      await sleep(FIRST_DELAY_MS);
      while (!cancelled) {
        const data = nextToast();
        setToast(data);
        setPhase("enter");
        await sleep(enterMs);
        if (cancelled) break;
        setPhase("visible");
        await sleep(HOLD_VISIBLE_MS);
        if (cancelled) break;
        setPhase("exit");
        await sleep(exitMs);
        if (cancelled) break;
        setToast(null);
        setPhase(null);
        await sleep(GAP_AFTER_EXIT_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [disabled, variant]);

  if (disabled) return null;

  if (!portalReady || typeof document === "undefined") {
    return null;
  }

  if (previewPortal !== undefined && previewPortal.root === null) {
    return null;
  }

  const portalTarget =
    previewPortal !== undefined && previewPortal.root !== null
      ? previewPortal.root
      : document.body;
  const dockInPreviewCard = previewPortal !== undefined && previewPortal.root !== null;

  return createPortal(
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes capture-notifi-enter-rl {
            from {
              opacity: 0;
              transform: translateX(calc(100% + 28px));
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes capture-notifi-exit-fade {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(0);
            }
          }
          .capture-notifi-card[data-phase="enter"] {
            animation: capture-notifi-enter-rl ${ENTER_ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
          .capture-notifi-card[data-phase="visible"] {
            transform: translateX(0);
            opacity: 1;
          }
          .capture-notifi-card[data-phase="exit"] {
            animation: capture-notifi-exit-fade ${EXIT_ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          @media (prefers-reduced-motion: reduce) {
            .capture-notifi-card[data-phase="enter"],
            .capture-notifi-card[data-phase="exit"] {
              animation: none !important;
              opacity: 1;
              transform: translateX(0);
            }
          }
        `,
        }}
      />
      <div
        className={toastPositionLayerClasses(
          position,
          dockInPreviewCard ? "preview" : "viewport",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && phase ? (
          <div
            key={toast.id}
            data-phase={phase}
            className={`capture-notifi-card flex max-w-[min(calc(100vw-1.5rem),21rem)] items-center gap-3 rounded-xl border border-black/10 bg-white/95 py-2.5 pl-2.5 pr-3 shadow-xl backdrop-blur-sm ${
              variant === "coupon" ? "border-orange-200/90" : ""
            }`}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md">
              <Image
                src={toast.avatarSrc}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-extrabold text-neutral-900">{toast.name}</p>
              {variant === "coupon" ? (
                <p className="mt-0.5 text-xs font-medium leading-snug text-neutral-600">
                  resgatou um cupom de{" "}
                  <span className="font-black text-orange-600">{toast.pct ?? 0}%</span> Off em produtos
                </p>
              ) : (
                <p className="mt-0.5 text-xs font-semibold text-neutral-600">
                  <span className="text-emerald-600" aria-hidden>
                    ✓
                  </span>{" "}
                  entrou no grupo
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>,
    portalTarget,
  );
}
