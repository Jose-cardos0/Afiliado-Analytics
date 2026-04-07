/**
 * Utilitários partilhados para landings de captura em viewports estreitos
 * (telemóveis, preview do mockup ~320px).
 */

/** CTA principal: altura mínima, texto fluido, ícone não encolhe. */
export const CAPTURE_CTA_CLASS =
  "inline-flex w-full min-h-[3.25rem] max-w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-center text-[clamp(0.8125rem,3.6vw,1rem)] font-bold leading-snug tracking-wide text-white no-underline sm:min-h-[3.5rem] sm:px-6 sm:py-4 sm:text-base [&_svg]:shrink-0";

/** Mesmo que CAPTURE_CTA_CLASS + uppercase (modelos com botão em caps). */
export const CAPTURE_CTA_CLASS_UPPER = `${CAPTURE_CTA_CLASS} uppercase`;

/** Título hero central — evita palavras isoladas com text-balance. */
export const CAPTURE_TITLE_HERO =
  "text-balance text-center text-[clamp(1.125rem,5.5vw,1.875rem)] font-extrabold leading-[1.15] tracking-tight sm:text-3xl";

/** Corpo de texto central. */
export const CAPTURE_BODY =
  "text-pretty text-center text-[clamp(0.8125rem,3.5vw,1rem)] leading-relaxed";

/** Label dentro do botão (permite quebra sem esmagar o layout). */
export const CAPTURE_CTA_LABEL = "min-w-0 flex-1 text-center leading-snug";
